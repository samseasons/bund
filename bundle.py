# python3 bundle.py a.js y.js

import sys

base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_'

def parse (file, imported, modules):
    try:
        with open(file, 'r') as text:
            text = text.read()
    except:
        return ''
    while text.find(' \n') > -1:
        text = text.replace(' \n', '\n')
    while text.find('\n\n') > -1:
        text = text.replace('\n\n', '\n')
    lines = text.split('\n')
    text = ''
    remove = False
    for line in lines:
        if line.lstrip().startswith('//'):
            continue
        if not remove and '/*' in line and '//*' not in line:
            if '*/' in line:
                line = line[:line.find('/*')] + ' ' + line[line.find('*/') + 2:]
            else:
                line = line[:line.find('/*')]
                remove = True
        if remove:
            if '*/' in line:
                line = line[line.find('*/') + 2:]
                remove = False
            else:
                continue
        if len(line) and len(line.replace(' ', '')):
            text += line.rstrip(' ') + '\n'
    texta = text

    def resolve (f):
        if f[:2] == './':
            f = f[2:]
        if f[0] != '.' and f[0] != '/':
            f = '/'.join(file.split('/')[:-1]) + '/' + f
        elif f.startswith('../'):
            i = 0
            while f.startswith('../'):
                f = f[3:]
                i += 1
            split = '/'.join(file.split('/')[:-1 - i])
            f = split + '/' + f if len(split) else f
        return f if f[-3:] == '.js' else f + '.js'

    files = {}
    i = text.find('import ')
    while i > -1:
        if i != 0 and text[i - 1] not in ['\n', ' ']:
            text = text[i + 6:]
            i = text.find('import ')
            continue
        text = text[i:]
        i = 6
        while text[i] == ' ':
            i += 1
        if text[i] == '{':
            text = text[i:]
            k = text.find('}')
            names = text[1:k].split(',')
            names = [name.replace(' ', '') for name in names]
            names = [name for name in names if name not in ['', '{', '}']]
            text = text[k:]
            if ' from ' in text:
                i = text.find(' from ') + 6
                while text[i] == ' ':
                    i += 1
                if text[i] == "'":
                    text = text[i + 1:]
                    f = resolve(text[:text.find("'")])
                    files[f] = files[f] + names if f in files else names
        else:
            names = []
            if ' from ' in text:
                j = text.find(' ')
                k = text.find(' from ')
                while j < k:
                    while text[i] == ' ':
                        i += 1
                    name = text[i:k].split(' ')[0]
                    if name not in ['', '{', '}']:
                        names += [name]
                    i = j
                    text = text[j:]
                    if ',' in text:
                        j = text.find(',')
                    k = text.find(' from ')
                text = text[k:]
                i = 6
            while text[i] == ' ':
                i += 1
            if text[i] == "'":
                text = text[i + 1:]
                f = resolve(text[:text.find("'")])
                files[f] = files[f] + names if f in files else names
        i = text.find('import ')
    modules[file] = list(files.keys())
    if len([i for i in modules[file] if i not in imported and (i not in modules or file not in modules[i])]):
        return ''
    exporta = ['async', 'class', 'const', 'default', 'function', 'let', 'var']
    repeata = ['\n', ' ', '(', ',', '.', '[']
    text = texta
    i = text.find('export ')
    while i > -1:
        text = text[i + 7:]
        for name in exporta:
            j = text.find(name)
            if j > -1 and j < 3:
                text = text[j + len(name):]
        if '\n' in text:
            names = text[:text.find('\n')]
        split = []
        if '=' not in names or '(' in names and names.find('=') > names.find('('):
            split += [names]
        else:
            while '=' in names:
                split += [names[:names.find('=')]]
                names = names[names.find('='):]
                names = names[names.find(','):] if ',' in names else ''
        names = []
        for name in split:
            while name[0] in repeata:
                name = name[1:]
            for j in repeata:
                if j in name:
                    name = name[:name.find(j)]
            names += [name]
        files[file] = names if file not in files else files[file] + names
        i = text.find('export ')

    def replace (text, past, new):
        length = len(past)
        a = 0
        while past in text[a:]:
            a += text[a:].find(past)
            if len(text) < a + 1 + length:
                return text
            cont = False
            textb = text[a - 7:a] + new
            for name in exporta:
                if name + '_' in textb:
                    cont = True
            if cont or text[a + length] in base64 or text[a - 1] in base64 + "'.":
                a += length
                continue
            text = text[:a] + new + text[a + length:]
            a += len(new)
        return text

    text = texta
    for file in files:
        string = file.replace('.', '_').replace('/', '_')
        split = string.split('_')
        string = string[:-len(split[len(split) - 1]) - 1]
        for name in files[file]:
            text = replace(text, name, name + '_' + string)
    lines = text.split('\n')
    text = ''
    for line in lines:
        if line.startswith('export default '):
            line = line[line.find('export default ') + 15:]
        if line.startswith('export '):
            line = line[line.find('export ') + 7:]
        if len(line) and not line.startswith('import '):
            text += line + '\n'
    return text

def build (file, output):
    imported = []
    imports = [file]
    modules = {}
    texts = {}
    while len(imports):
        file = imports[0]
        if file in imported:
            imports = [i for i in imports if i != file]
        else:
            texts[file] = parse(file, imported, modules)
            imports = modules[file] + imports
            if len(texts[file]):
                imported += [file]
    text = ''
    imports = []
    for file in imported:
        if file not in imports:
            text += texts[file]
            imports += [file]
    with open(output, 'w') as file:
        file.write(text)

args = sys.argv
build(args[1], args[2])