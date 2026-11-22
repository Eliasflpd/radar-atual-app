# JUIZ DAS CENAS HISTÓRICAS DO NEXUS: o ChatGPT olha a imagem e dá nota 0–10 com os defeitos.
# Critérios: fidelidade à arqueologia e ao texto, anacronismos, fotorrealismo e linguagem de cinema.
# uso: powershell -File scripts\juiz-cena.ps1 -imagem <cena.png> -lugar "Cafarnaum, ano 30" [-saida <nota.json>]
param([Parameter(Mandatory)][string]$imagem, [Parameter(Mandatory)][string]$lugar, [string]$saida = '')
Set-Location (Split-Path $imagem)
$pedido = @"
Voce e um painel de juizes: um arqueologo do periodo do Segundo Templo, um historiador do Novo Testamento e um diretor de fotografia de cinema. A imagem anexa deveria mostrar: $lugar.
Avalie com rigor: fidelidade arqueologica (materiais, arquitetura, roupas, barcos e objetos do seculo I na Judeia e Galileia), anacronismos (qualquer coisa posterior ao seculo I, como igrejas, sinagogas brancas do seculo IV, cupulas, vidro, metal moderno), coerencia com os evangelhos, fotorrealismo, composicao e luz de cinema, sensacao de escala (pessoas pequenas na vastidao).
Responda SOMENTE um objeto JSON valido, sem texto fora dele, com exatamente estas chaves nesta ordem: nota (numero de 0 a 10 com uma casa decimal), aprovado (true se nota maior ou igual a 8, senao false), defeitos (lista de textos concretos), consertos (lista de textos, cada um uma instrucao concreta para refazer a imagem).
"@
$resp = codex exec --skip-git-repo-check --sandbox read-only $pedido -i $imagem 2>&1 | Out-String
$todos = [regex]::Matches($resp, '\{\s*"nota"[\s\S]*?\]\s*\}')
if (-not $todos.Count) { Write-Output 'SEM RESPOSTA DO JUIZ'; Write-Output ($resp | Select-Object -Last 20); exit 1 }
$json = $todos[$todos.Count - 1].Value
if ($saida) { [IO.File]::WriteAllText($saida, $json, (New-Object Text.UTF8Encoding $false)) }
$json
