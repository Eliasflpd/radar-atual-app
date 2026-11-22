# Uma peça nova para a maquete, de ponta a ponta: o ChatGPT desenha a imagem e o Hunyuan3D-2 a transforma em 3D.
# uso: powershell -File scripts\peca-3d.ps1 -nome boi -descricao "um dos doze bois de bronze do mar de fundição (1 Rs 7:25)" [-resolucao 160]
param([Parameter(Mandatory)][string]$nome, [Parameter(Mandatory)][string]$descricao, [int]$resolucao = 200)
$raiz = Split-Path $PSScriptRoot -Parent
$pasta = Join-Path $raiz "NEXUS-BIBLICO\templo-chatgpt\pecas"
New-Item -ItemType Directory -Force $pasta | Out-Null
$img = Join-Path $pasta "$nome.png"
if (-not (Test-Path $img)) {
  $pedido = Join-Path $pasta "pedido-$nome.txt"
  "Gere a imagem `"$nome.png`" nesta pasta: $descricao. Um único objeto inteiro, centralizado, fundo branco liso, luz de estúdio suave, vista em três quartos, sem sombra no chão, sem texto, alta definição, reconstituição arqueológica fotorrealista." | Set-Content -Encoding utf8 $pedido
  powershell -NoProfile -File C:\wosp5\chatgpt-mockup.ps1 -pasta $pasta -pedido $pedido
}
python (Join-Path $PSScriptRoot "imagem-para-3d.py") $img (Join-Path $raiz "public\nexus\templo3d\$nome.glb") $resolucao
