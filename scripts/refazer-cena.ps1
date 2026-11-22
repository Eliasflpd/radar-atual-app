# Ciclo arquiteto → juiz: refaz uma cena com os consertos que o juiz pediu e julga de novo (até 2 voltas).
# uso: powershell -File scripts\refazer-cena.ps1 -pasta <pasta> -nome magdala -lugar "descrição para o juiz" -base "descrição da cena"
param([Parameter(Mandatory)][string]$pasta, [Parameter(Mandatory)][string]$nome, [Parameter(Mandatory)][string]$lugar, [Parameter(Mandatory)][string]$base, [int]$voltas = 2)
$juiz = Join-Path $PSScriptRoot 'juiz-cena.ps1'
for ($v = 2; $v -le $voltas + 1; $v++) {
  $notaAnt = Join-Path $pasta ($(if ($v -eq 2) { "$nome-nota.json" } else { "$nome-v$($v-1)-nota.json" }))
  $j = Get-Content $notaAnt -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($j.aprovado) { Write-Output "$nome aprovado com nota $($j.nota)"; break }
  $consertos = ($j.consertos | ForEach-Object { '- ' + ($_ -replace '"', "'") }) -join "`n"
  $pedido = "Refaca a imagem '$nome-v$v.png' nesta pasta, em formato panoramico largo 21:9, fotorrealista e cinematografica, sem texto: $($base -replace '"', "'")`nCorrecoes obrigatorias pedidas pelo painel de arqueologos e diretores de fotografia:`n$consertos"
  $arq = Join-Path $pasta "pedido-$nome-v$v.txt"; [IO.File]::WriteAllText($arq, $pedido, (New-Object Text.UTF8Encoding $false))
  powershell -NoProfile -File C:\wosp5\chatgpt-mockup.ps1 -pasta $pasta -pedido $arq | Out-Null
  $img = Join-Path $pasta "$nome-v$v.png"
  if (-not (Test-Path $img)) { Write-Output "$nome-v$v nao foi gerada"; break }
  $res = powershell -NoProfile -File $juiz -imagem $img -lugar $lugar -saida (Join-Path $pasta "$nome-v$v-nota.json")
  $n = ($res | Out-String | ConvertFrom-Json)
  Write-Output "$nome v$v -> nota $($n.nota) aprovado=$($n.aprovado)"
  if ($n.aprovado) { break }
}
