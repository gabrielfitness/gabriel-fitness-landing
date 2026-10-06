#!/usr/bin/env python3
"""Add CC0 MakeHuman morphs to the exact M1 GLB; never reindex the base.
python3 tools/build-morphs.py [--source /path/to/pinned/makehuman]
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path)
args = parser.parse_args()
manifest = json.loads((ROOT / 'models/body-male.source.json').read_text())
base = (ROOT / 'models/body-male.glb').read_bytes()
assert hashlib.sha256(base).hexdigest() == manifest['glbSha256'], 'M1 GLB was changed'
json_len = struct.unpack_from('<I', base, 12)[0]
gltf = json.loads(base[20:20+json_len])
binary = bytearray(base[28+json_len:])
ids = manifest['originalVertexIds']


def accessor(index):
    a = gltf['accessors'][index]
    v = gltf['bufferViews'][a['bufferView']]
    components = 3 if a['type'] == 'VEC3' else 1
    code = 'f' if a['componentType'] == 5126 else 'H'
    return list(struct.unpack_from('<' + code * (a['count'] * components), binary, v.get('byteOffset', 0)))


positions, base_normals, indices = accessor(0), accessor(1), accessor(2)
sources = []


def target(muscle, weight):
    path = f'makehuman/data/targets/macrodetails/universal-male-young-{muscle}muscle-{weight}weight.target'
    url = f"https://raw.githubusercontent.com/makehumancommunity/makehuman/{manifest['upstreamCommit']}/{path}"
    data = (args.source / path).read_bytes() if args.source else urllib.request.urlopen(url, timeout=30).read()
    assert b'explicitly released as CC0' in data, f'Missing CC0 notice: {path}'
    digest = hashlib.sha256(data).hexdigest()
    for old in manifest['sources']:
        if old['path'] == path:
            assert old['sha256'] == digest, 'M1 source mismatch'
    sources.append({'path': path, 'url': url, 'sha256': digest})
    offsets = {}
    for line in data.decode().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        i, *values = line.split()
        offsets[int(i)] = [float(x) * manifest['metersPerSourceUnit'] for x in values]
    return [v for i in ids for v in offsets.get(i, (0, 0, 0))]


def normals(pos):
    result = [0.0] * len(pos)
    for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
        a, b, c = a*3, b*3, c*3
        u = [pos[b+j]-pos[a+j] for j in range(3)]
        v = [pos[c+j]-pos[a+j] for j in range(3)]
        cross = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
        for i in (a, b, c):
            for j in range(3):
                result[i+j] += cross[j]
    for i in range(0, len(result), 3):
        length = math.sqrt(sum(v*v for v in result[i:i+3])) or 1
        for j in range(3):
            result[i+j] /= length
    return result


def append(values):
    while len(binary) % 4:
        binary.append(0)
    chunk = struct.pack('<' + 'f'*len(values), *values)
    view = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(chunk), 'target': 34962})
    binary.extend(chunk)
    index = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view, 'componentType': 5126, 'count': len(ids), 'type': 'VEC3',
                            'min': [min(values[j::3]) for j in range(3)],
                            'max': [max(values[j::3]) for j in range(3)]})
    return index


neutral = target('average', 'average')
targets, names, grid = [], [], []
for mi, muscle in enumerate(('min', 'average', 'max')):
    for wi, weight in enumerate(('min', 'average', 'max')):
        if mi == wi == 1:
            continue
        delta = [v-n for v, n in zip(target(muscle, weight), neutral)]
        absolute = [p+d for p, d in zip(positions, delta)]
        normal_delta = [v-n for v, n in zip(normals(absolute), base_normals)]
        targets.append({'POSITION': append(delta), 'NORMAL': append(normal_delta)})
        names.append(f'muscle_{muscle}__weight_{weight}')
        grid.append({'muscle': mi/2, 'fat': wi/2, 'name': names[-1]})
mesh = gltf['meshes'][0]
mesh['name'] = 'MakeHuman adult male — same M1 topology, 8 joint morph targets'
mesh['primitives'][0]['targets'] = targets
mesh['weights'] = [0] * len(targets)
mesh['extras'] = {'targetNames': names, 'gfitGrid': grid}
gltf['buffers'][0]['byteLength'] = len(binary)
gltf['asset']['generator'] = 'GFIT M2 morph packer; exact M1 base buffers'
payload = json.dumps(gltf, separators=(',', ':'), ensure_ascii=True).encode()
payload += b' ' * (-len(payload) % 4)
binary += b'\0' * (-len(binary) % 4)
output = struct.pack('<III', 0x46546C67, 2, 28+len(payload)+len(binary))
output += struct.pack('<II', len(payload), 0x4E4F534A) + payload
output += struct.pack('<II', len(binary), 0x004E4942) + binary
(ROOT / 'models/body-male-parametric.glb').write_bytes(output)
report = {'upstreamCommit': manifest['upstreamCommit'], 'baseGlbSha256': manifest['glbSha256'],
          'sha256': hashlib.sha256(output).hexdigest(), 'bytes': len(output), 'sources': sources,
          'vertexCount': len(ids), 'triangleCount': len(indices)//3, 'morphs': grid,
          'baseBuffers': 'M1 POSITION, NORMAL, indices copied byte-for-byte; same vertex IDs and topology',
          'interpolation': 'nonnegative bilinear weights on the 3x3 weight/muscle grid; neutral implicit'}
(ROOT / 'models/body-male-parametric.source.json').write_text(json.dumps(report, indent=2)+'\n')
print(f'Packed {len(targets)} morphs, {len(output):,} bytes; M1 unchanged')
