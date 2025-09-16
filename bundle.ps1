# ./bundle.ps1 a.js y.js

$base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_'

function parse ($file, $imported, $modules) {
    try {
        $text = Get-Content $file -ErrorAction Stop
    } catch {
        return ''
    }
    while ($text.Contains(" `n")) {
        $text = $text.Replace(" `n", "`n")
    }
    while ($text.Contains("`n`n")) {
        $text = $text.Replace("`n`n", "`n")
    }
    $lines = $text.Split("`n")
    $text = ''
    $remove = $false
    foreach ($line in $lines) {
        if ($line.TrimStart().StartsWith('//')) {
            continue
        }
        if (!$remove -and $line.Contains('/*') -and !$line.Contains('//*')) {
            if ($line.Contains('*/')) {
                $line = $line.Substring(0, $line.IndexOf('/*')) + ' ' + $line.Substring($line.IndexOf('*/') + 2)
            } else {
                $line = $line.Substring(0, $line.IndexOf('/*'))
                $remove = $true
            }
        }
        if ($remove) {
            if ($line.Contains('*/')) {
                $line = $line.Substring($line.IndexOf('*/') + 2)
                $remove = $false
            } else {
                continue
            }
        }
        if ($line.Length -and $line.Replace(' ', '').Length) {
            $text += $line.TrimEnd(' ') + "`n"
        }
    }
    $texta = $text

    function resolve ($f) {
        if ($f.Substring(0, 2) -eq './') {
            $f = $f.Substring(2)
        }
        if ($f[0] -ne '.' -and $f[0] -ne '/') {
            $split = $file.Split('/')
            $f = ($split[0..($split.Length - 2)] -join '/') + '/' + $f
        } elseif ($f.StartsWith('../')) {
            $i = 0
            while ($f.StartsWith('../')) {
                $f = $f.Substring(3)
                $i += 1
            }
            $split = $file.Split('/')
            $split = $split[0..($split.Length - 2 - $i)] -join '/'
            $f = &{If($split.Length) {$split + '/' + $f} Else {$f}}
        }
        return &{If($f.Substring($f.Length - 3) -eq '.js') {$f} Else {$f + '.js'}}
    }

    $files = [ordered]@{}
    $i = $text.IndexOf('import ')
    while ($i -gt -1) {
        if ($i -ne 0 -and $text[$i - 1] -notin @("`n", ' ')) {
            $text = $text.Substring($i + 6)
            $i = $text.IndexOf('import ')
            continue
        }
        $text = $text.Substring($i)
        $i = 6
        while ($text[$i] -eq ' ') {
            $i += 1
        }
        if ($text[$i] -eq '{') {
            $text = $text.Substring($i)
            $k = $text.IndexOf('}')
            $names = $text.Substring(1, $k - 1).Split(',')
            $names = $names.ForEach({$_.Replace(' ', '')})
            $names = $names.Where({$_ -notin @('', '{', '}')})
            $text = $text.Substring($k)
            if ($text.Contains(' from ')) {
                $i = $text.IndexOf(' from ') + 6
                while ($text[$i] -eq ' ') {
                    $i += 1
                }
                if ($text[$i] -eq "'") {
                    $text = $text.Substring($i + 1)
                    $f = resolve $text.Substring(0, $text.IndexOf("'"))
                    $files[$f] = &{If($f -in $files.Keys) {@() + $files[$f] + $names} Else {$names}}
                }
            }
        } else {
            $names = @()
            if ($text.Contains(' from ')) {
                $j = $text.IndexOf(' ')
                $k = $text.IndexOf(' from ')
                while ($j -lt $k) {
                    while ($text[$i] -eq ' ') {
                        $i += 1
                    }
                    $name = $text.Substring($i, $k - $i).Split(' ')[0]
                    if ($name -notin @('', '{', '}')) {
                        $names += $name
                    }
                    $i = $j
                    $text = $text.Substring($j)
                    if ($text.Contains(',')) {
                        $j = $text.IndexOf(',')
                    }
                    $k = $text.IndexOf(' from ')
                }
                $text = $text.Substring($k)
                $i = 6
            }
            while ($text[$i] -eq ' ') {
                $i += 1
            }
            if ($text[$i] -eq "'") {
                $text = $text.Substring($i + 1)
                $f = resolve $text.Substring(0, $text.IndexOf("'"))
                $files[$f] = &{If($f -in $files.Keys) {@() + $files[$f] + $names} Else {$names}}
            }
        }
        $i = $text.IndexOf('import ')
    }
    $modules[$file] = @($files.Keys)
    if ($modules[$file].Where({$_ -notin $imported -and $file -notin $modules[$_]}).Length) {
        return ''
    }
    $exporta = @('async', 'class', 'const', 'default', 'function', 'let', 'var')
    $repeata = @("`n", ' ', '(', ',', '.', '[')
    $text = $texta
    $i = $text.IndexOf('export ')
    while ($i -gt -1) {
        $text = $text.Substring($i + 7)
        foreach ($name in $exporta) {
            $j = $text.IndexOf($name)
            if ($j -gt -1 -and $j -lt 3) {
                $text = $text.Substring($j + $name.Length)
            }
        }
        if ($text.Contains("`n")) {
            $names = $text.Substring(0, $text.IndexOf("`n"))
        }
        $split = @()
        if (!$names.Contains('=') -or ($names.Contains('(') -and $names.IndexOf('=') -gt $names.IndexOf('('))) {
            $split += $names
        } else {
            while ($names.Contains('=')) {
                $split += $names.Substring(0, $names.IndexOf('='))
                $names = $names.Substring($names.IndexOf('='))
                $names = &{If($names.Contains(',')) {$names.Substring($names.IndexOf(','))} Else {''}}
            }
        }
        $names = @()
        foreach ($name in $split) {
            while ($name[0] -in $repeata) {
                $name = $name.Substring(1)
            }
            foreach ($j in $repeata) {
                if ($name.Contains($j)) {
                    $name = $name.Substring(0, $name.IndexOf($j))
                }
            }
            $names += $name
        }
        $files[$file] = &{If($file -in $files.Keys) {@() + $files[$file] + $names} Else {$names}}
        $i = $text.IndexOf('export ')
    }

    function replace ($text, $past, $next) {
        $length = $past.Length
        $a = 0
        while ($text.Substring($a).Contains($past)) {
            $a += $text.Substring($a).IndexOf($past)
            if ($text.Length -lt $a + 1 + $length) {
                return $text
            }
            $cont = $false
            $textb = $text.Substring($a - 7, 7) + $next
            foreach ($name in $exporta) {
                if ($textb.Contains($name + '_')) {
                    $cont = $true
                }
            }
            if ($cont -or $base64.Contains($text[$a + $length]) -or ($base64 + "'.").Contains($text[$a - 1])) {
                $a += $length
                continue
            }
            $text = $text.Substring(0, $a) + $next + $text.Substring($a + $length)
            $a += $next.Length
        }
        return $text
    }

    $text = $texta
    foreach ($file in $files.Keys) {
        $string = $file.Replace('.', '_').Replace('/', '_')
        $split = $string.Split('_')
        $string = $string.Substring(0, $string.Length - $split[$split.Length - 1].Length - 1)
        foreach ($name in $files[$file]) {
            $text = replace $text $name ($name + '_' + $string)
        }
    }
    $lines = $text.Split("`n")
    $text = ''
    foreach ($line in $lines) {
        if ($line.StartsWith('export default ')) {
            $line = $line.Substring($line.IndexOf('export default ') + 15)
        }
        if ($line.StartsWith('export ')) {
            $line = $line.Substring($line.IndexOf('export ') + 7)
        }
        if ($line.Length -and !$line.StartsWith('import ')) {
            $text += $line + "`n"
        }
    }
    return $text
}

function build ($file, $output) {
    $imported = @()
    $imports = @($file)
    $modules = @{}
    $texts = @{}
    while ($imports.Length) {
        $file = $imports[0]
        if ($file -in $imported) {
            $imports = $imports.Where({$_ -ne $file})
        } else {
            $texts[$file] = parse $file $imported $modules
            $imports = $modules[$file] + $imports
            if ($texts[$file].Length) {
                $imported += $file
            }
        }
    }
    $text = ''
    $imports = @()
    foreach ($file in $imported) {
        if ($file -notin $imports) {
            $text += $texts[$file]
            $imports += $file
        }
    }
    $text.TrimEnd("`n") > $output
}

build $args[0] $args[1]