#!/usr/bin/env python3
"""Divide ZIP original de acervo PDF em lotes menores para importação no Render.
Uso: python3 scripts/dividir_acervo_zip.py arquivo.zip pasta_saida --limite-mb 45
Não altera o ZIP original, não adiciona credenciais e mantém pastas internas.
"""
import argparse
import pathlib
import zipfile

parser=argparse.ArgumentParser(description='Separação de acervo PDF em ZIPs menores')
parser.add_argument('arquivo',type=pathlib.Path)
parser.add_argument('saida',type=pathlib.Path)
parser.add_argument('--limite-mb',type=int,default=45,help='Tamanho aproximado máximo de cada ZIP comprimido')
args=parser.parse_args()
if not 20<=args.limite_mb<=200: parser.error('Use limite entre 20 e 200 MB.')
args.saida.mkdir(parents=True,exist_ok=True)
limit=args.limite_mb*1024*1024
with zipfile.ZipFile(args.arquivo,'r') as source:
 entries=[i for i in source.infolist() if not i.is_dir() and i.filename.lower().endswith('.pdf')]
 if not entries:parser.error('ZIP sem PDFs.')
 index=0;z=None;estimate=0;count=0
 try:
  for info in entries:
   if info.file_size>20*1024*1024:print('IGNORADO (>20MB):',info.filename);continue
   if z is None or (estimate+info.compress_size>limit and count):
    if z:z.close()
    index+=1;target=args.saida/f'{args.arquivo.stem}_PARTE_{index:02}.zip'
    z=zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)
    estimate=0;count=0
   with source.open(info) as origin, z.open(info.filename,'w',force_zip64=True) as dest:
    while True:
     chunk=origin.read(1024*1024)
     if not chunk:break
     dest.write(chunk)
   estimate+=info.compress_size;count+=1
 finally:
  if z:z.close()
print(f'PDFs selecionados: {len(entries)} · lotes gerados: {index}')
