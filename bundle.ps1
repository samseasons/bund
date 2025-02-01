# for windows




$func = {}
$return_null = { return $null }
$return_this = { return $this }
$return_true = { return $true }
$return_false = { return $false }

class tree {
    $type; tree ($props) {
        $this.func('tree', @('a', 'z', 'f'), $props)
    }
}
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName func -Value { param($type, $args, $props)
    $this.type = $type
    if ($props) { foreach ($arg in $args) { $this[$arg] = $props[$arg] } }
}
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName ascend -Value $func
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName branch -Value $func
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName _copy -Value { param($deep)
    if ($deep) {
        $self = $this.copy()
        function return_root ($root) { if ($root -ne $self) { return $root.copy($true) } }

        return $self.transform([transforms]::new((return_root)))
    }
    return $this::new()
}
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName copy -Value { param($deep)
    return $this._copy($deep)
}
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName equals -Value $return_false
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName observe -Value { param($observer)
    return $observer.observe($this)
}
Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName transform -Value { param($trees, $trim)
    $trees += $this

    if ($trees.before) { $transformed = $trees.before($this, $this.ascend, $trim) }
    if (!$transformed) {
        $transformed = $this
        $this.ascend($transformed, $trees)
        if ($trees.after) {
            $after = $trees.after($transformed, $trim)
            if ($after) { $transformed = $after }
        }
    }
    $trees = $trees[0..($trees.Length - 2)]
    return $transformed
}

class menta : tree {
    menta ($props) : base($props) {
        $this.func('menta', @('a', 'z', 'f'), $props)
    }
}


class observes {
    $callback; $stack; observes ($callback) {
        $this.callback = $callback
        $this.stack = @()
    }
    observe ($root, $ascend) {
        $this.stack += $root
    }
}

class transforms : observes {
    $after; $before; transforms ($before, $after) : base() {
        $this.after = $after
        $this.before = $before
    }
}


function out ($la) {
    if ($la -eq 'js') { Update-TypeData -Force -TypeName tree -MemberType ScriptMethod -MemberName show -Value $func }
}

function solve ($file, $folder) {
    return (($file.split('/') | Select-Object -SkipLast $folder.IndexOf('/')) -join '/') + '/' + $folder.split('./')[-1]
}

function parse ($opt, $text) {
    if ($false) {
        $of = solve $opt.of $mod.value
        if (($of -notin $opt.om) -and ($of -notin $opt.oq)) { $opt.om.push($of) }
    }
    return $opt
}

function build ($of, $fo) {
    out 'js'
    $opt = @{top = [tree]::new({})}
    $om = @($of)
    $oq = @()

    while ($om.Length) {
        $of = $om[0]
        if ($of -in $oq) {
            $om = $om[1..$om.Length]
        } else {
            try {
                $text = Get-Content -Path $of
            } catch {
                $text = ''
            }
            $opt.of = $of
            $opt.om = $om
            $opt.oq = $oq
            $oq += $of
            $opt = parse $opt $text
            $om = $opt.om
        }
    }
    $output = $opt.top.show()
    if ($output) { $output > $fo }
}


build $args[0] $args[1]