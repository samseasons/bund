// node bundle.js a.js y.js

import fs from 'fs'

const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_'

function parse (file, imported, modules) {
  let f, j, k, line, name, names, remove, split, string, text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
  while (text.includes(' \n')) {
    text = text.replaceAll(' \n', '\n')
  }
  while (text.includes('\n\n')) {
    text = text.replaceAll('\n\n', '\n')
  }
  let lines = text.split('\n')
  text = ''
  for (line of lines) {
    if (line.trimStart().startsWith('//')) {
      continue
    }
    if (!remove && line.includes('/*') && !line.includes('//*')) {
      if (line.includes('*/')) {
        line = line.slice(0, line.indexOf('/*')) + ' ' + line.slice(line.indexOf('*/') + 2)
      } else {
        line = line.slice(0, line.indexOf('/*'))
        remove = true
      }
    }
    if (remove) {
      if (line.includes('*/')) {
        line = line.slice(line.indexOf('*/') + 2)
        remove = false
      } else {
        continue
      }
    }
    if (line.length && line.replaceAll(' ', '').length) {
      text += line.trimEnd(' ') + '\n'
    }
  }
  const texta = text

  function resolve (f) {
    if (f.slice(0, 2) == './') {
      f = f.slice(2)
    }
    if (f[0] != '.' && f[0] != '/') {
      f = file.split('/').slice(0, -1).join('/') + '/' + f
    } else if (f.startsWith('../')) {
      let i = 0
      while (f.startsWith('../')) {
        f = f.slice(3)
        i += 1
      }
      split = file.split('/').slice(0, -1 - i)
      f = split.length ? split + '/' + f : f
    }
    return f.slice(-3) == '.js' ? f : f + '.js'
  }

  const files = {}
  let i = text.indexOf('import ')
  while (i > -1) {
    if (i != 0 && !['\n', ' '].includes(text[i - 1])) {
      text = text.slice(i + 6)
      i = text.indexOf('import ')
      continue
    }
    text = text.slice(i)
    i = 6
    while (text[i] == ' ') {
      i += 1
    }
    if (text[i] == '{') {
      text = text.slice(i)
      k = text.indexOf('}')
      names = text.slice(1, k).split(',')
      names = names.map(name => name.replaceAll(' ', ''))
      names = names.filter(name => !['', '{', '}'].includes(name))
      text = text.slice(k)
      if (text.includes(' from ')) {
        i = text.indexOf(' from ') + 6
        while (text[i] == ' ') {
          i += 1
        }
        if (text[i] == "'") {
          text = text.slice(i + 1)
          f = resolve(text.slice(0, text.indexOf("'")))
          f in files ? files[f].push(...names) : files[f] = names
        }
      }
    } else {
      names = []
      if (text.includes(' from ')) {
        j = text.indexOf(' ')
        k = text.indexOf(' from ')
        while (j < k) {
          while (text[i] == ' ') {
            i += 1
          }
          name = text.slice(i, k).split(' ')[0]
          if (!['', '{', '}'].includes(name)) {
            names.push(name)
          }
          i = j
          text = text.slice(j)
          if (text.includes(',')) {
            j = text.indexOf(',')
          }
          k = text.indexOf(' from ')
        }
        text = text.slice(k)
        i = 6
      }
      while (text[i] == ' ') {
        i += 1
      }
      if (text[i] == "'") {
        text = text.slice(i + 1)
        f = resolve(text.slice(0, text.indexOf("'")))
        f in files ? files[f].push(...names) : files[f] = names
      }
    }
    i = text.indexOf('import ')
  }
  modules[file] = Object.keys(files)
  if (modules[file].filter(i => !imported.includes(i) && (!(i in modules) || !modules[i].includes(file))).length) {
    return ''
  }
  const exporta = ['async', 'class', 'const', 'default', 'function', 'let', 'var']
  const repeata = ['\n', ' ', '(', ',', '.', '[']
  text = texta
  i = text.indexOf('export ')
  while (i > -1) {
    text = text.slice(i + 7)
    for (name of exporta) {
      j = text.indexOf(name)
      if (j > -1 && j < 3) {
        text = text.slice(j + name.length)
      }
    }
    if (text.includes('\n')) {
      names = text.slice(0, text.indexOf('\n'))
    }
    split = []
    if (!names.includes('=') || names.includes('(') && names.indexOf('=') > names.indexOf('(')) {
      split.push(names)
    } else {
      while (names.includes('=')) {
        split.push(names.slice(0, names.indexOf('=')))
        names = names.slice(names.indexOf('='))
        names = names.includes(',') ? names.slice(names.indexOf(',')) : ''
      }
    }
    names = []
    for (name of split) {
      while (repeata.includes(name[0])) {
        name = name.slice(1)
      }
      for (j of repeata) {
        if (name.includes(j)) {
          name = name.slice(0, name.indexOf(j))
        }
      }
      names.push(name)
    }
    file in files ? files[file].push(...names) : files[file] = names
    i = text.indexOf('export ')
  }

  function replace (text, past, next) {
    const length = past.length
    let a = 0, cont, textb
    while (text.slice(a).includes(past)) {
      a += text.slice(a).indexOf(past)
      if (text.length < a + 1 + length) {
        return text
      }
      cont = false
      textb = text.slice(a - 7, a) + next
      for (name of exporta) {
        if (textb.includes(name + '_')) {
          cont = true
        }
      }
      if (cont || base64.includes(text[a + length]) || (base64 + "'.").includes(text[a - 1])) {
        a += length
        continue
      }
      text = text.slice(0, a) + next + text.slice(a + length)
      a += next.length
    }
    return text
  }

  text = texta
  for (file in files) {
    string = file.replaceAll('.', '_').replaceAll('/', '_')
    split = string.split('_')
    string = string.slice(0, -split[split.length - 1].length - 1)
    for (name of files[file]) {
      text = replace(text, name, name + '_' + string)
    }
  }
  lines = text.split('\n')
  text = ''
  for (line of lines) {
    if (line.startsWith('export default ')) {
      line = line.slice(line.indexOf('export default ') + 15)
    }
    if (line.startsWith('export ')) {
      line = line.slice(line.indexOf('export ') + 7)
    }
    if (line.length && !line.startsWith('import ')) {
      text += line + '\n'
    }
  }
  return text
}

function build (file, output) {
  const imported = []
  let imports = [file]
  const modules = {}
  const texts = {}
  while (imports.length) {
    file = imports[0]
    if (imported.includes(file)) {
      imports = imports.filter(i => i != file)
    } else {
      texts[file] = parse(file, imported, modules)
      imports.unshift(...modules[file])
      if (texts[file].length) {
        imported.push(file)
      }
    }
  }
  let text = ''
  imports = []
  for (file of imported) {
    if (!imports.includes(file)) {
      text += texts[file]
      imports.push(file)
    }
  }
  fs.writeFileSync(output, text)
}

const args = process.argv
build(args[2], args[3])