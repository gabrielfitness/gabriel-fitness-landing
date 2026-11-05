#!/usr/bin/env python3
"""Append two localized CC0 shoulder morphs without modifying any M2 buffer.
Usage: python3 tools/build-shoulders.py [--source /path/to/pinned/makehuman]
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
M2_SHA = '005b55f374e58b3f8d78c2184a38aeb520699c3f6fdff0bae0a2defe3eb0e327'
args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--source', type=Path)
args = args.parse_args()
base = (ROOT / 'models/body-male-parametric.glb').read_bytes()
assert hashlib.sha256(base).hexdigest() == M2_SHA
n = struct.unpack_from('<I', base, 12)[0]
gltf = json.loads(base[20:20+n])
binary = bytearray(base[28+n:])
ids = json.loads((ROOT / 'models/body-male.source.json').read_text())['originalVertexIds']

def attr(i):
    a = gltf['accessors'][i]
    view = gltf['bufferViews'][a['bufferView']]
    code = 'f' if a['componentType'] == 5126 else 'H'
    count = a['count'] * (3 if a['type'] == 'VEC3' else 1)
    return list(struct.unpack_from('<'+code*count, binary, view.get('byteOffset', 0)))

positions, base_normals, indices = attr(0), attr(1), attr(2)

def normals(pos):
    out = [0.] * len(pos)
    for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
        a, b, c = a*3, b*3, c*3
        u = [pos[b+j]-pos[a+j] for j in range(3)]
        v = [pos[c+j]-pos[a+j] for j in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        for i in (a, b, c):
            for j in range(3):
                out[i+j] += cross[j]
    for i in range(0, len(out), 3):
        length = math.sqrt(sum(v*v for v in out[i:i+3])) or 1
        for j in range(3):
            out[i+j] /= length
    return out

def append(values):
    chunk = struct.pack('<'+'f'*len(values), *values)
    view = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(chunk), 'target': 34962})
    binary.extend(chunk)
    i = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view, 'componentType': 5126, 'count': len(ids), 'type': 'VEC3',
                            'min': [min(values[j::3]) for j in range(3)], 'max': [max(values[j::3]) for j in range(3)]})
    return i

# Pin hashes independently of download location; checked even for --source.
HASHES = {'r-upperarm-shoulder-muscle-incr.target': '33d8d39af985071484836ebda826ab50332408256b1e6d2ab2240d480fd00295', 'l-upperarm-shoulder-muscle-incr.target': '0d1994d9d45b5f7b5d4884262514fee53c6fd111bce1cc931a6fcb69f60aa8b6', 'r-upperarm-shoulder-muscle-decr.target': 'ad633eb4c77f9868866472f23d2e413042ce6e051b01b081f8633e999d6e000f', 'l-upperarm-shoulder-muscle-decr.target': 'b78c40015e3e623294f6e4a00a176557ddd31e4424e46c1ed817b48711301b5f'}
sources, targets_info = [], []
mesh = gltf['meshes'][0]
for direction in ('decr', 'incr'):
    offsets = {}
    for side in ('l', 'r'):
        name = f'{side}-upperarm-shoulder-muscle-{direction}.target'
        path = f'makehuman/data/targets/armslegs/{name}'
        url = f'https://raw.githubusercontent.com/makehumancommunity/makehuman/{COMMIT}/{path}'
        data = (args.source / path).read_bytes() if args.source else urllib.request.urlopen(url, timeout=30).read()
        sha = hashlib.sha256(data).hexdigest()
        assert sha == HASHES[name], f'Source hash mismatch: {name}'
        assert b'explicitly released as CC0' in data
        sources.append({'path': path, 'url': url, 'sha256': sha})
        for line in data.decode().splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            i, *v = line.split()
            assert int(i) not in offsets, 'Overlapping left/right source regions'
            offsets[int(i)] = [float(x)*.1 for x in v]
    delta = [v for i in ids for v in offsets.get(i, (0., 0., 0.))]
    affected = [i for i in range(len(ids)) if any(delta[i*3:i*3+3])]
    # Only update normal deltas on incident triangles' vertices. Recomputing
    # unrelated normals would otherwise introduce tiny roundoff changes globally.
    affected_set = set(affected)
    normal_ids = set()
    for tri in zip(indices[::3], indices[1::3], indices[2::3]):
        if affected_set.intersection(tri):
            normal_ids.update(tri)
    calculated = normals([p+d for p, d in zip(positions, delta)])
    normal_delta = [calculated[i]-base_normals[i] if i//3 in normal_ids else 0. for i in range(len(delta))]
    mesh['primitives'][0]['targets'].append({'POSITION': append(delta), 'NORMAL': append(normal_delta)})
    name = 'shoulders_'+direction
    mesh['extras']['targetNames'].append(name)
    mesh['weights'].append(0)
    targets_info.append({'name': name, 'affectedVertexIds': affected, 'affectedOriginalVertexIds': [ids[i] for i in affected],
                         'normalVertexIds': sorted(normal_ids), 'affectedCount': len(affected),
                         'boundsMeters': {'min': [min(positions[i*3+j] for i in affected) for j in range(3)],
                                          'max': [max(positions[i*3+j] for i in affected) for j in range(3)]},
                         'maxDisplacementMeters': max(math.sqrt(sum(v*v for v in delta[i*3:i*3+3])) for i in affected)})
mesh['name'] = 'MakeHuman male — M2 unchanged + localized bilateral shoulders'
gltf['asset']['generator'] = 'GFIT M4 shoulder packer; all M2 buffers unchanged'
gltf['buffers'][0]['byteLength'] = len(binary)
payload = json.dumps(gltf, separators=(',', ':'), ensure_ascii=True).encode()
payload += b' ' * (-len(payload) % 4)
out = struct.pack('<III', 0x46546C67, 2, 28+len(payload)+len(binary))
out += struct.pack('<II', len(payload), 0x4E4F534A) + payload
out += struct.pack('<II', len(binary), 0x004E4942) + binary
(ROOT / 'models/body-male-shoulders.glb').write_bytes(out)
report = {'upstreamCommit': COMMIT, 'm2Sha256': M2_SHA, 'sha256': hashlib.sha256(out).hexdigest(),
          'bytes': len(out), 'addedBytes': len(out)-len(base), 'vertexCount': len(ids), 'triangleCount': len(indices)//3,
          'sources': sources, 'targets': targets_info, 'range': {'slider': [0, 50, 100], 'decrWeight': [1, 0, 0], 'incrWeight': [0, 0, 1]},
          'method': 'Unmodified bilateral authored offsets (dm to m), same original vertex IDs. Additive localized morphs on top of all M2 states; no object scaling or translation. Normal deltas limited to one-ring neighborhood.'}
(ROOT / 'models/body-male-shoulders.source.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('sources','targets')},indent=2))
