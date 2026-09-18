param([ValidateSet('dev','build','start','typecheck','lint','test','test:e2e','test:db','release:sql','test:release','db:status','db:content','db:connect','test:content')][string]$Task='dev')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
if($nodeCommand){$nodeExecutable=$nodeCommand.Source}else{
 $runtimeRoot=Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes\cua_node'
 $nodeExecutable=Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
}
if(-not $nodeExecutable){throw 'Install Node.js LTS to run this project.'}
$env:PATH=(Split-Path $nodeExecutable)+';'+$env:PATH
$localPnpm=Join-Path $projectRoot '.tools\node_modules\pnpm\bin\pnpm.mjs'
if(Test-Path -LiteralPath $localPnpm){& $nodeExecutable $localPnpm run $Task}else{pnpm run $Task}
exit $LASTEXITCODE
