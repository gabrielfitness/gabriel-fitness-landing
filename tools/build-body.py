#!/usr/bin/env python3
"""Build the M1 GLB from pinned CC0 MakeHuman data. Python standard library only.

Usage: python3 tools/build-body.py [--source /path/to/makehuman-checkout]
Without --source, downloads the five data files from the pinned upstream commit.
No MakeHuman application code is copied or executed.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import urllib.request

REV = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path)
args = parser.parse_args()
sources = []


def read(path):
    url = f'https://raw.githubusercontent.com/makehumancommunity/makehuman/{REV}/{path}'
    data = (args.source / path).read_bytes() if args.source else urllib.request.urlopen(url, timeout=30).read()
    sources.append({'path': path, 'url': url, 'sha256': hashlib.sha256(data).hexdigest()})
    return data.decode('utf-8')


vertices, faces = [], []
group = ''
for line in read('makehuman/data/3dobjs/base.obj').splitlines():
    fields = line.split()
    if not fields:
        continue
    if fields[0] == 'v':
        vertices.append(list(map(float, fields[1:4])))
    elif fields[0] == 'g':
        group = fields[1]
    elif fields[0] == 'f' and group == 'body':
        face = [int(f.split('/')[0]) - 1 for f in fields[1:]]
        for i in range(1, len(face) - 1):
            faces.append([face[0], face[i], face[i + 1]])

# Official adult male shape; average the three upstream ancestry components.
# These are asset filenames, not choices exposed to users.
for name, weight in [(f'{race}-male-young', 1 / 3) for race in ('african', 'asian', 'caucasian')] + [
    ('universal-male-young-averagemuscle-averageweight', 1)
]:
    for line in read(f'makehuman/data/targets/macrodetails/{name}.target').splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        i, x, y, z = line.split()
        for axis, delta in enumerate((x, y, z)):
            vertices[int(i)][axis] += float(delta) * weight

# Retain sorted original vertex IDs: future morph deltas can use exactly this map.
ids = sorted({i for face in faces for i in face})
remap = {old: new for new, old in enumerate(ids)}
positions = [[v * 0.1 for v in vertices[i]] for i in ids]  # decimeters -> meters
floor = min(p[1] for p in positions)
for p in positions:
    p[1] -= floor
indices = [remap[i] for face in faces for i in face]
normals = [[0.0, 0.0, 0.0] for _ in ids]
for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
    u = [positions[b][j] - positions[a][j] for j in range(3)]
    v = [positions[c][j] - positions[a][j] for j in range(3)]
    n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
    for i in (a, b, c):
        for j in range(3):
            normals[i][j] += n[j]
for n in normals:
    length = math.sqrt(sum(v*v for v in n)) or 1
    for j in range(3):
        n[j] /= length

binary = bytearray()
views = []
for values, code, target in [([v for p in positions for v in p], 'f', 34962),
                              ([v for n in normals for v in n], 'f', 34962),
                              (indices, 'H', 34963)]:
    while len(binary) % 4:
        binary.append(0)
    chunk = struct.pack('<' + code * len(values), *values)
    views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(chunk), 'target': target})
    binary.extend(chunk)
gltf = {
    'asset': {'version': '2.0', 'generator': 'GFIT CC0 body converter',
              'copyright': 'MakeHuman Team / CC0 1.0; see THIRD_PARTY_ASSETS.md'},
    'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'Body'}],
    'meshes': [{'name': 'MakeHuman adult male — M1', 'primitives': [
        {'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
    'materials': [{'name': 'Neutral matte mannequin', 'pbrMetallicRoughness': {
        'baseColorFactor': [0.53, 0.55, 0.57, 1], 'metallicFactor': 0.05, 'roughnessFactor': 0.7}}],
    'buffers': [{'byteLength': len(binary)}], 'bufferViews': views,
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': len(ids), 'type': 'VEC3',
         'min': [min(p[j] for p in positions) for j in range(3)],
         'max': [max(p[j] for p in positions) for j in range(3)]},
        {'bufferView': 1, 'componentType': 5126, 'count': len(ids), 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5123, 'count': len(indices), 'type': 'SCALAR'}]
}
payload = json.dumps(gltf, separators=(',', ':'), ensure_ascii=True).encode()
payload += b' ' * (-len(payload) % 4)
binary += b'\0' * (-len(binary) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 28 + len(payload) + len(binary))
glb += struct.pack('<II', len(payload), 0x4E4F534A) + payload
glb += struct.pack('<II', len(binary), 0x004E4942) + binary
(ROOT / 'models' / 'body-male.glb').write_bytes(glb)
manifest = {'upstreamCommit': REV, 'sources': sources, 'vertexCount': len(ids),
            'triangleCount': len(indices)//3, 'bytes': len(glb), 'originalVertexIds': ids,
            'metersPerSourceUnit': 0.1, 'floorOffsetMeters': floor,
            'glbSha256': hashlib.sha256(glb).hexdigest()}
(ROOT / 'models' / 'body-male.source.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
print(f'Built body-male.glb: {len(ids)} vertices, {len(indices)//3} triangles, {len(glb):,} bytes')
