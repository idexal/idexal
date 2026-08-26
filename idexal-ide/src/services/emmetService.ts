/**
 * Emmet Abbreviation Service
 * Expands Emmet abbreviations for HTML/CSS
 */

interface EmmetSnippet {
  abbreviation: string
  expansion: string
  language: string
}

const HTML_ABBREVIATIONS: Record<string, string> = {
  'div': '<div></div>',
  'div.container': '<div class="container"></div>',
  'div#main': '<div id="main"></div>',
  'p': '<p></p>',
  'span': '<span></span>',
  'a': '<a href=""></a>',
  'a.link': '<a href="" class="link"></a>',
  'button': '<button></button>',
  'input': '<input type="text" />',
  'input:text': '<input type="text" />',
  'input:email': '<input type="email" />',
  'input:password': '<input type="password" />',
  'input:submit': '<input type="submit" />',
  'input:checkbox': '<input type="checkbox" />',
  'input:radio': '<input type="radio" />',
  'img': '<img src="" alt="" />',
  'h1': '<h1></h1>',
  'h2': '<h2></h2>',
  'h3': '<h3></h3>',
  'h4': '<h4></h4>',
  'h5': '<h5></h5>',
  'h6': '<h6></h6>',
  'ul': '<ul></ul>',
  'ol': '<ol></ol>',
  'li': '<li></li>',
  'table': '<table></table>',
  'tr': '<tr></tr>',
  'td': '<td></td>',
  'th': '<th></th>',
  'form': '<form action=""></form>',
  'label': '<label></label>',
  'select': '<select></select>',
  'option': '<option value=""></option>',
  'textarea': '<textarea name="" id="" cols="30" rows="10"></textarea>',
  'section': '<section></section>',
  'article': '<article></article>',
  'header': '<header></header>',
  'footer': '<footer></footer>',
  'main': '<main></main>',
  'nav': '<nav></nav>',
  'aside': '<aside></aside>',
  'div.flex': '<div class="flex"></div>',
  'div.grid': '<div class="grid"></div>',
  'div.flex-center': '<div class="flex items-center justify-center"></div>',
  'script': '<script src=""></script>',
  'style': '<style></style>',
  'link': '<link rel="stylesheet" href="" />',
  'html5': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title></title>\n</head>\n<body>\n  \n</body>\n</html>',
}

const CSS_ABBREVIATIONS: Record<string, string> = {
  'd': 'display: ',
  'd:n': 'display: none;',
  'd:b': 'display: block;',
  'd:f': 'display: flex;',
  'd:g': 'display: grid;',
  'd:ib': 'display: inline-block;',
  'd:i': 'display: inline;',
  'pos': 'position: ',
  'pos:s': 'position: static;',
  'pos:r': 'position: relative;',
  'pos:a': 'position: absolute;',
  'pos:f': 'position: fixed;',
  'pos:st': 'position: sticky;',
  'w': 'width: ',
  'h': 'height: ',
  'm': 'margin: ',
  'mt': 'margin-top: ',
  'mr': 'margin-right: ',
  'mb': 'margin-bottom: ',
  'ml': 'margin-left: ',
  'mx': 'margin-left: ; margin-right: ',
  'my': 'margin-top: ; margin-bottom: ',
  'p': 'padding: ',
  'pt': 'padding-top: ',
  'pr': 'padding-right: ',
  'pb': 'padding-bottom: ',
  'pl': 'padding-left: ',
  'px': 'padding-left: ; padding-right: ',
  'py': 'padding-top: ; padding-bottom: ',
  'bg': 'background: ',
  'bgc': 'background-color: ',
  'c': 'color: ',
  'fw': 'font-weight: ',
  'fw:n': 'font-weight: normal;',
  'fw:b': 'font-weight: bold;',
  'fs': 'font-size: ',
  'fst': 'font-style: ',
  'fst:n': 'font-style: normal;',
  'fst:i': 'font-style: italic;',
  'ff': 'font-family: ',
  'ta': 'text-align: ',
  'ta:l': 'text-align: left;',
  'ta:c': 'text-align: center;',
  'ta:r': 'text-align: right;',
  'td': 'text-decoration: ',
  'td:n': 'text-decoration: none;',
  'td:u': 'text-decoration: underline;',
  'lh': 'line-height: ',
  'ls': 'letter-spacing: ',
  'ov': 'overflow: ',
  'ov:h': 'overflow: hidden;',
  'ov:s': 'overflow: scroll;',
  'ov:a': 'overflow: auto;',
  'z': 'z-index: ',
  'op': 'opacity: ',
  'bdrs': 'border-radius: ',
  'bd': 'border: ',
  'bds': 'border-style: ',
  'bdw': 'border-width: ',
  'bdc': 'border-color: ',
  'bxsh': 'box-shadow: ',
  'bxz': 'box-sizing: ',
  'bxz:cb': 'box-sizing: content-box;',
  'bxz:bb': 'box-sizing: border-box;',
  'trf': 'transform: ',
  'trf:r': 'transform: rotate(',
  'trf:s': 'transform: scale(',
  'trf:t': 'transform: translate(',
  'trn': 'transition: ',
  'cur': 'cursor: ',
  'cur:p': 'cursor: pointer;',
  'cur:d': 'cursor: default;',
  'us': 'user-select: ',
  'us:n': 'user-select: none;',
  'whs': 'white-space: ',
  'ws': 'word-spacing: ',
  'gua': 'grid-auto-rows: ',
  'gac': 'grid-auto-columns: ',
  'gc': 'grid-column: ',
  'gr': 'grid-row: ',
  'gg': 'grid-gap: ',
  'ai': 'align-items: ',
  'ai:c': 'align-items: center;',
  'ai:s': 'align-items: flex-start;',
  'ai:e': 'align-items: flex-end;',
  'ac': 'align-content: ',
  'jc': 'justify-content: ',
  'jc:c': 'justify-content: center;',
  'jc:s': 'justify-content: flex-start;',
  'jc:e': 'justify-content: flex-end;',
  'jc:sa': 'justify-content: space-around;',
  'jc:sb': 'justify-content: space-between;',
  'fwf': 'flex-wrap: ',
  'fg': 'flex-grow: ',
  'fshrink': 'flex-shrink: ',
  'fb': 'flex-basis: ',
  'fd': 'flex-direction: ',
  'fd:r': 'flex-direction: row;',
  'fd:c': 'flex-direction: column;',
  'fd:cr': 'flex-direction: column-reverse;',
  'fd:rr': 'flex-direction: row-reverse;',
  'tov': 'text-overflow: ',
  'tov:e': 'text-overflow: ellipsis;',
}

const JSX_ABBREVIATIONS: Record<string, string> = {
  ...HTML_ABBREVIATIONS,
  'imr': 'import React from "react"',
  'imrd': 'import ReactDOM from "react-dom"',
  'impc': 'import {  } from ""',
  'rcc': 'import React from "react";\n\ninterface Props {\n  \n}\n\nexport default function Component({  }: Props) {\n  return (\n    <div>\n      \n    </div>\n  )\n}',
  'rfc': 'import { forwardRef } from "react";\n\ninterface Props {\n  \n}\n\nconst Component = forwardRef<HTMLDivElement, Props>(({  }, ref) => {\n  return (\n    <div ref={ref}>\n      \n    </div>\n  )\n})\n\nComponent.displayName = "Component";\n\nexport default Component;',
  'useState': 'const [state, setState] = useState(initialState)',
  'useEffect': 'useEffect(() => {\n  \n}, [])',
  'useCallback': 'useCallback(() => {\n  \n}, [])',
  'useMemo': 'useMemo(() => {\n  \n}, [])',
  'useRef': 'useRef(null)',
}

const TYPESCRIPT_ABBREVIATIONS: Record<string, string> = {
  'i': 'interface  {\n  \n}',
  't': 'type  = ',
  'tp': 'type Props = {\n  \n}',
  'cl': 'class  {\n  \n}',
  'fn': 'function () {\n  \n}',
  'afn': '() => {\n  \n}',
  'con': 'const  = ',
  'let': 'let  = ',
  'if': 'if () {\n  \n}',
  'ife': 'if () {\n  \n} else {\n  \n}',
  'for': 'for (let i = 0; i < ; i++) {\n  \n}',
  'foreach': '.forEach((item) => {\n  \n})',
  'map': '.map((item) => {\n  \n})',
  'filter': '.filter((item) => {\n  \n})',
  'reduce': '.reduce((acc, item) => {\n  \n}, )',
  'try': 'try {\n  \n} catch (error) {\n  \n}',
  'prom': 'new Promise((resolve, reject) => {\n  \n})',
  'async': 'async () => {\n  \n}',
}

const RUST_ABBREVIATIONS: Record<string, string> = {
  'fn': 'fn () {\n  \n}',
  'pfn': 'pub fn () {\n  \n}',
  'st': 'struct  {\n  \n}',
  'pst': 'pub struct  {\n  \n}',
  'en': 'enum  {\n  \n}',
  'pen': 'pub enum  {\n  \n}',
  'impl': 'impl  {\n  \n}',
  'derive': '#[derive(Debug, Clone)]\n',
  'vec': 'Vec::new()',
  'opt': 'Option<()>',
  'res': 'Result<(), Box<dyn std::error::Error>>',
  'match': 'match  {\n  _ => (),\n}',
  'ifl': 'if let Some() =  {\n  \n}',
  'forl': 'for  in  {\n  \n}',
  'test': '#[cfg(test)]\nmod tests {\n  use super::*;\n\n  #[test]\n  fn test_() {\n    \n  }\n}',
}

const PYTHON_ABBREVIATIONS: Record<string, string> = {
  'def': 'def ():\n    pass',
  'class': 'class :\n    def __init__(self):\n        pass',
  'if': 'if :\n    pass',
  'ife': 'if :\n    pass\nelse:\n    pass',
  'for': 'for  in :\n    pass',
  'fori': 'for i in range():\n    pass',
  'while': 'while :\n    pass',
  'with': 'with  as :\n    pass',
  'try': 'try:\n    pass\nexcept Exception as e:\n    pass',
  'main': 'if __name__ == "__main__":\n    pass',
  'init': 'def __init__(self):\n    pass',
  'self': 'self.',
  'ret': 'return ',
  'pr': 'print()',
  'list': '[  for  in ]',
  'dict': '{  for  in }',
  'lambda': 'lambda : ',
}

const LANGUAGE_MAPS: Record<string, Record<string, string>> = {
  'html': HTML_ABBREVIATIONS,
  'htm': HTML_ABBREVIATIONS,
  'jsx': JSX_ABBREVIATIONS,
  'tsx': JSX_ABBREVIATIONS,
  'vue': HTML_ABBREVIATIONS,
  'xml': HTML_ABBREVIATIONS,
  'css': CSS_ABBREVIATIONS,
  'scss': CSS_ABBREVIATIONS,
  'less': CSS_ABBREVIATIONS,
  'typescript': TYPESCRIPT_ABBREVIATIONS,
  'ts': TYPESCRIPT_ABBREVIATIONS,
  'typescriptreact': TYPESCRIPT_ABBREVIATIONS,
  'javascript': TYPESCRIPT_ABBREVIATIONS,
  'js': TYPESCRIPT_ABBREVIATIONS,
  'rust': RUST_ABBREVIATIONS,
  'rs': RUST_ABBREVIATIONS,
  'python': PYTHON_ABBREVIATIONS,
  'py': PYTHON_ABBREVIATIONS,
}

/**
 * Try to expand an Emmet abbreviation for a given language.
 * Returns null if no expansion is found.
 */
export function expandEmmet(abbreviation: string, language: string): string | null {
  const normalizedLang = language.toLowerCase().replace(/[^a-z]/g, '')
  const map = LANGUAGE_MAPS[normalizedLang] || LANGUAGE_MAPS['html']
  
  // Try exact match first
  if (map[abbreviation]) return map[abbreviation]

  // Try with language-specific map
  const langMap = LANGUAGE_MAPS[language.toLowerCase()]
  if (langMap && langMap[abbreviation]) return langMap[abbreviation]

  return null
}

/**
 * Get all abbreviations for a language
 */
export function getAbbreviations(language: string): EmmetSnippet[] {
  const normalizedLang = language.toLowerCase().replace(/[^a-z]/g, '')
  const map = LANGUAGE_MAPS[normalizedLang] || {}
  
  return Object.entries(map).map(([abbreviation, expansion]) => ({
    abbreviation,
    expansion,
    language: normalizedLang,
  }))
}

/**
 * Check if text looks like an Emmet abbreviation
 */
export function isEmmetAbbreviation(text: string): boolean {
  // Simple heuristic: contains only word chars, dots, #, $, >, +, ~, (), [], etc.
  return /^[a-zA-Z0-9_.#>+*()\-[\]{}|^$=:@]+$/.test(text.trim()) && text.trim().length > 0 && text.trim().length < 100
}

/**
 * Get language-specific snippet categories
 */
export function getSnippetCategories(language: string): string[] {
  const categories: Record<string, string[]> = {
    html: ['Elements', 'Forms', 'Layout', 'Media', 'Template'],
    css: ['Display', 'Position', 'Sizing', 'Spacing', 'Typography', 'Background', 'Flexbox', 'Grid'],
    typescript: ['Functions', 'Classes', 'Interfaces', 'Control Flow', 'Array Methods'],
    rust: ['Functions', 'Structs', 'Enums', 'Traits', 'Macros', 'Testing'],
    python: ['Functions', 'Classes', 'Control Flow', 'List Comprehensions'],
  }
  
  const normalizedLang = language.toLowerCase().replace(/[^a-z]/g, '')
  return categories[normalizedLang] || categories['html']
}

/**
 * Insert text at cursor position in Monaco editor
 */
export function insertSnippetInEditor(
  editor: any,
  abbreviation: string,
  expansion: string
): void {
  if (!editor) return
  const selection = editor.getSelection()
  if (!selection) return
  
  const model = editor.getModel()
  if (!model) return

  // Get the word at cursor to replace
  const word = model.getWordAtPosition(selection.getPosition())
  if (word && word.word === abbreviation) {
    const range = {
      startLineNumber: selection.startLineNumber,
      startColumn: word.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: word.endColumn,
    }
    editor.executeEdits('emmet', [{ range, text: expansion }])
  } else {
    editor.executeEdits('emmet', [{ range: selection, text: expansion }])
  }
}
