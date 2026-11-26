// pt-BR for the settings tab, keyed by the English text the tab already uses.
// Missing keys fall back to English, so a new setting works before it has a
// translation. Setting keys, file names and `%% … %%` syntax stay as written.
import { currentLang, type Lang } from "./strings";

const PT: Record<string, string> = {
    "Backup and restore": "Backup e restauração",
    "Save and restore plugin settings":
        "Salvar e restaurar as configurações do plugin",
    "Export settings": "Exportar configurações",
    "Save the current settings to a JSON file.":
        "Salva as configurações atuais num arquivo JSON.",
    Export: "Exportar",
    "Import settings": "Importar configurações",
    "Load settings from a previously exported JSON file.":
        "Carrega as configurações de um arquivo JSON exportado antes.",
    Import: "Importar",
    "Slide preview mode": "Modo da prévia dos slides",
    "Select the slide preview pane display mode.":
        "Escolha onde o painel da prévia aparece.",
    "As tab": "Como aba",
    "Split workspace": "Dividir a área de trabalho",
    "Right sidebar": "Barra lateral direita",
    "Automatically start the preview server":
        "Iniciar o servidor da prévia automaticamente",
    "Server port": "Porta do servidor",
    "Specify the port number for the server to listen on. Default is 3000.":
        "Número da porta em que o servidor escuta. O padrão é 3000.",
    "Server host": "Endereço do servidor",
    "Specify the host for the server to listen on. Default is localhost. Use 0.0.0.0 to allow external connections.":
        "Endereço em que o servidor escuta. O padrão é localhost. Use 0.0.0.0 para aceitar conexões externas.",
    "Auto reload": "Recarregar sozinho",
    "When enabled, the slide preview window automatically updates upon detecting changes in the source file.":
        "Quando ligado, a prévia dos slides se atualiza sozinha ao detectar mudanças na nota.",
    "Auto complete": "Autocompletar",
    'Enable auto-complete inputs. "Always" enables it everywhere, "When slide preview is active" enables it only when the slide preview is active, and "Never" disables it.':
        "Liga o autocompletar. “Sempre” liga em todo lugar, “Com a prévia aberta” liga só quando a prévia dos slides está aberta, e “Nunca” desliga.",
    Always: "Sempre",
    "When slide preview is active": "Com a prévia aberta",
    Never: "Nunca",
    "Slide menu (/)": "Menu de slides (/)",
    "In a slide note, type / to insert a new slide, layout, style, background, speaker notes and more. In other notes, type /slides to turn the note into slides.":
        "Numa nota de slides, digite / para inserir novo slide, layout, estilo, fundo, notas do apresentador e mais. Em outras notas, digite /slides para transformar a nota em slides.",
    "Export directory": "Pasta de exportação",
    "Specify the directory where Slidey should export presentations.":
        "Pasta onde o Slidey salva as apresentações exportadas.",
    Folder: "Pasta",
    "New deck template": "Modelo de nova apresentação",
    'A note that "New slide deck" copies. Leave blank for Slidey\'s starter deck.':
        "Uma nota que “New slide deck” copia. Deixe em branco para usar a apresentação de exemplo do Slidey.",
    "Starter deck": "Apresentação de exemplo",
    "Assets directory": "Pasta de recursos",
    "Specify a vault directory for custom themes, CSS, scripts, and HTML templates. CSS files are searched in css/ and the directory root. Scripts are searched in js/. HTML templates in html/.":
        "Pasta do cofre para temas, CSS, scripts e modelos HTML próprios. Os CSS são procurados em css/ e na raiz da pasta, os scripts em js/ e os modelos HTML em html/.",
    "Custom scripts": "Scripts próprios",
    "Load additional scripts into all presentations. Override per-note using property names.":
        "Carrega scripts extras em todas as apresentações. Cada nota pode mudar isso pelas propriedades.",
    Scripts: "Scripts",
    "Comma-separated local script paths (resolved from vault or theme directory).":
        "Caminhos de scripts locais, separados por vírgula (a partir do cofre ou da pasta do tema).",
    "Remote scripts": "Scripts remotos",
    "Comma-separated external script URLs.":
        "Endereços de scripts externos, separados por vírgula.",
    Slides: "Slides",
    "Default slide theme": "Tema de slide padrão",
    "Default highlight theme": "Tema de destaque de código padrão",
    "Auto slides": "Slides automáticos",
    "Pick each slide's layout from what you wrote (a lone heading is a title, a list is bullets, a picture fills the slide) and use one dark theme. Notes that set style, preset or layout in their properties keep their own look. Turn it off for one deck with autoSlides: false.":
        "Escolhe o layout de cada slide pelo que você escreveu (um título sozinho vira capa, uma lista vira tópicos, uma imagem preenche o slide) e usa um tema escuro. Notas com style, preset ou layout nas propriedades mantêm o visual próprio. Para desligar numa apresentação, use autoSlides: false.",
    "Shrink text to fit": "Encolher o texto para caber",
    "When a slide has more text than fits, make its text smaller (down to half size) so nothing runs off the slide. Turn it off for one deck with fitText: false in the note's properties.":
        "Quando o slide tem mais texto do que cabe, reduz o texto (até a metade) para nada sair do slide. Para desligar numa apresentação, use fitText: false nas propriedades da nota.",
    "Center content": "Centralizar o conteúdo",
    "When enabled, content is centered on the slide by default.":
        "Quando ligado, o conteúdo fica centralizado no slide por padrão.",
    "Transition style": "Estilo de transição",
    "Select a default slide transition": "Escolha a transição de slide padrão",
    none: "nenhuma",
    fade: "esmaecer",
    slide: "deslizar",
    convex: "convexa",
    concave: "côncava",
    zoom: "zoom",
    "Transition speed": "Velocidade da transição",
    "Select a default transition speed":
        "Escolha a velocidade de transição padrão",
    slow: "lenta",
    default: "padrão",
    fast: "rápida",
    "Default horizontal slide separator":
        "Separador horizontal de slides padrão",
    "Regex pattern used to split horizontal slides. Default: \\r?\\n---\\r?\\n. Override per-note with the 'separator' property.":
        "Expressão regular que separa os slides horizontais. Padrão: \\r?\\n---\\r?\\n. Cada nota pode mudar isso com a propriedade 'separator'.",
    "Default vertical slide separator": "Separador vertical de slides padrão",
    "Regex pattern used to split vertical slides. Default: \\r?\\n--\\r?\\n. Override per-note with the 'verticalSeparator' property.":
        "Expressão regular que separa os slides verticais. Padrão: \\r?\\n--\\r?\\n. Cada nota pode mudar isso com a propriedade 'verticalSeparator'.",
    "Presentation plugins": "Plugins da apresentação",
    "Control presentation plugins. Override per-note using property names (e.g., enableCustomControls).":
        "Controla os plugins da apresentação. Cada nota pode mudar isso pelas propriedades (por exemplo, enableCustomControls).",
    Controls: "Controles",
    "Display presentation control arrows.":
        "Mostra as setas de controle da apresentação.",
    Chalkboard: "Lousa",
    "Display a chalkboard and related controls.":
        "Mostra uma lousa e os controles dela.",
    "Elapsed time bar": "Barra de tempo decorrido",
    "Display an elapsed time bar; set 'timeForPresentation' property in seconds (500), minutes (55m), or hours (1h).":
        "Mostra uma barra de tempo decorrido; defina a propriedade 'timeForPresentation' em segundos (500), minutos (55m) ou horas (1h).",
    "Laser pointer": "Ponteiro laser",
    "Change your mouse into a laser pointer (toggle with Q).":
        "Transforma o mouse num ponteiro laser (liga e desliga com Q).",
    Menu: "Menu",
    "Display a presentation menu button.":
        "Mostra um botão de menu da apresentação.",
    Overview: "Visão geral",
    "When enabled, display a presentation overview button.":
        "Quando ligado, mostra um botão de visão geral da apresentação.",
    "Progress bar (progress)": "Barra de progresso (progress)",
    "When enabled, display a presentation progress bar.":
        "Quando ligado, mostra uma barra de progresso da apresentação.",
    "Slide numbers": "Números dos slides",
    "Display the page number of the current slide.":
        "Mostra o número do slide atual.",
    "Math engine": "Motor de matemática",
    "Select the math rendering engine.":
        "Escolha o motor que desenha as fórmulas.",
    About: "Sobre",
    "By Venari. MIT license. Slidey is a fork of Slides Extended (Erin Schnabel), itself a fork of Advanced Slides (Matthäus Szturc); slides run on reveal.js (MIT).":
        "Por Venari. Licença MIT. O Slidey é um fork do Slides Extended (Erin Schnabel), que por sua vez é um fork do Advanced Slides (Matthäus Szturc); os slides rodam em reveal.js (MIT).",
    "Help and feedback": "Ajuda e comentários",
    "User guide": "Guia do usuário",
    "What's new": "Novidades",
    "Report a problem or idea": "Relatar um problema ou ideia",
    ". Run the command “New slide deck” for a ready-made example.":
        ". Rode o comando “New slide deck” para ver um exemplo pronto.",
    Privacy: "Privacidade",
    "Slidey collects nothing and sends nothing. Your notes stay in your vault. The only network use is downloading its slide engine from GitHub once per version.":
        "O Slidey não coleta nem envia nada. Suas notas ficam no seu cofre. O único uso de rede é baixar o motor de slides do GitHub uma vez por versão.",
    "Heading levels": "Níveis de título",
    'For notes with "slides: headings" in their frontmatter: every heading starts a slide, and its level picks the layout, style and preset. One slide can pick others with "%% layout=two-column style=night %%" on the line under its heading; "%% noslide %%" leaves a section out.':
        'Para notas com "slides: headings" nas propriedades: cada título começa um slide, e o nível dele escolhe layout, estilo e predefinição. Um slide pode escolher outros com "%% layout=two-column style=night %%" na linha abaixo do título; "%% noslide %%" deixa uma seção de fora.',
    Layout: "Layout",
    Style: "Estilo",
    Preset: "Predefinição",
    "Slide presets": "Predefinições de slide",
    'Use one with "preset: <name>" in a note’s frontmatter, or "%% preset=<name> %%" at the top of a single slide. "preset=none" on a slide opts out of the deck default.':
        'Use uma com "preset: <nome>" nas propriedades da nota, ou "%% preset=<nome> %%" no topo de um slide. "preset=none" num slide ignora o padrão da apresentação.',
    "Slide styles": "Estilos de slide",
    'The look of a slide: colors and fonts. Use one with "style: <name>" in a note’s frontmatter, or "%% style=<name> %%" at the top of a single slide. Works together with a preset. Fonts must be installed on this computer.':
        'O visual de um slide: cores e fontes. Use um com "style: <nome>" nas propriedades da nota, ou "%% style=<nome> %%" no topo de um slide. Funciona junto com uma predefinição. As fontes precisam estar instaladas neste computador.',
    "Reset to starters": "Voltar aos exemplos",
    "Font scale": "Escala da fonte",
    Alignment: "Alinhamento",
    "(theme default)": "(padrão do tema)",
    Left: "Esquerda",
    Center: "Centro",
    Right: "Direita",
    "Custom CSS": "CSS próprio",
    "Advanced. `&` is replaced with the slide selector.":
        "Avançado. `&` é trocado pelo seletor do slide.",
    "name (used in markdown)": "nome (usado no markdown)",
    "e.g. #4dabf7 (blank = theme)": "ex.: #4dabf7 (vazio = tema)",
    "e.g. Georgia (blank = theme)": "ex.: Georgia (vazio = tema)",
    "Slidey: that file doesn't contain valid JSON.":
        "Slidey: esse arquivo não tem um JSON válido.",
    "Slidey: settings imported.": "Slidey: configurações importadas.",
    "Slidey: failed to read the settings file.":
        "Slidey: não consegui ler o arquivo de configurações.",
    "deck default": "padrão da apresentação",
};

// Words inside generated text like "Add preset" or "Layout: deck default".
const NOUN: Record<string, string> = {
    preset: "predefinição",
    style: "estilo",
};

/** `text` in `lang`; unknown text comes back unchanged. */
export function trIn(text: string, lang: Lang): string {
    if (lang === "en") {
        return text;
    }
    if (PT[text]) {
        return PT[text];
    }
    let m = /^(#+) Heading (\d)$/.exec(text);
    if (m) {
        return `${m[1]} Título ${m[2]}`;
    }
    m = /^Slidey (\d.*)$/.exec(text);
    if (m) {
        return `Slidey ${m[1]}`;
    }
    m = /^(Add|Delete) (preset|style)$/.exec(text);
    if (m) {
        return `${m[1] === "Add" ? "Adicionar" : "Excluir"} ${NOUN[m[2]]}`;
    }
    m = /^(Layout|Style|Preset): (.*?)( \(missing\))?$/.exec(text);
    if (m) {
        const rest = PT[m[2]] ?? m[2];
        return `${PT[m[1]]}: ${rest}${m[3] ? " (ausente)" : ""}`;
    }
    return text;
}

/** `text` in Obsidian's current language. */
export function tr(text: string): string {
    return trIn(text, currentLang());
}
