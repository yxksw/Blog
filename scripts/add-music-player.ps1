# 批量为所有页面添加 MusicPlayer

$pages = @(
    @{Path="src/pages/admin.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/bangumi.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/cover.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/equipment.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/fc.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/files.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/important/index.astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/links/index.astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/sponsors.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/tags/index.astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/tags/[tag].astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/timetable.astro"; ImportPath="../components/MusicPlayer.svelte"},
    @{Path="src/pages/timetable/[week].astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/blog/index.astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/blog/[...slug].astro"; ImportPath="../../components/MusicPlayer.svelte"},
    @{Path="src/pages/blog/page/[...page].astro"; ImportPath="../../../components/MusicPlayer.svelte"},
    @{Path="src/pages/404.astro"; ImportPath="../components/MusicPlayer.svelte"}
)

$modifiedCount = 0

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot ".." $page.Path
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # 检查是否已经包含 MusicPlayer
        if ($content -match "MusicPlayer") {
            Write-Host "Skipping $($page.Path) - already has MusicPlayer" -ForegroundColor Yellow
            continue
        }
        
        # 添加 import 语句
        $importStatement = "import MusicPlayer from '$($page.ImportPath)';"
        $content = $content -replace "(---\r?\n)(.*?)(\r?\n---)", "`$1`$2`r`n$importStatement`r`n`$3"
        
        # 添加 MusicPlayer 组件到 </body> 前
        $musicPlayerComponent = "    <!-- MusicPlayer -->`r`n    <MusicPlayer client:load />`r`n"
        $content = $content -replace "(</body>)", "$musicPlayerComponent`$1"
        
        # 保存文件
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Modified $($page.Path)" -ForegroundColor Green
        $modifiedCount++
    } else {
        Write-Host "File not found: $($page.Path)" -ForegroundColor Red
    }
}

Write-Host "`nTotal modified: $modifiedCount files" -ForegroundColor Cyan
