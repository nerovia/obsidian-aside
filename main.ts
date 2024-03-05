import { App, MarkdownRenderChild, MarkdownRenderer, Notice, Plugin, PluginSettingTab, Setting, TFile, parseYaml } from 'obsidian';

const CODEBLOCK_ID = 'aside'
const DEFAULT_SETTINGS: Partial<AsidePluginSettings> = {
	templatePath: ''
}

interface AsidePluginSettings {
	templatePath: string
}

class AsideSettingTab extends PluginSettingTab {
	plugin: AsidePlugin

	constructor(app: App, plugin: AsidePlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display() {
		let { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName('Template')
			.setDesc('Set ')
			.addText(text => {
				text.setPlaceholder('template.yaml')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async it => {
					this.plugin.settings.templatePath = it
					this.plugin.saveSettings()
				})
			})
	}
}

export default class AsidePlugin extends Plugin {
	settings: AsidePluginSettings

	async onload() {

		// load settings
		await this.loadSettings()
		this.addSettingTab(new AsideSettingTab(this.app, this))

		// subscribe to reading-view resize to adjust container width
		this.registerEvent(this.app.workspace.on('resize', () => {
			this.app.workspace.containerEl.querySelectorAll('.markdown-reading-view').forEach(it => {
				const bounds = it.getBoundingClientRect()
				if (bounds.width > 600)
					it.addClass('aside-wide')
				else
					it.removeClass('aside-wide')
			})
		}))

		// register aside block processor
		this.registerMarkdownCodeBlockProcessor(CODEBLOCK_ID, (source, el, ctx) => {
			ctx.addChild(new AsideRenderChild(this.app, el, ctx.sourcePath, source))
		})

		// register instert aside command
		this.addCommand({
			id: 'insert-aside-command',
			name: 'Insert Aside',
			editorCallback: async (editor) => {
				let yaml = ''
				if (this.settings.templatePath) {
					const path = this.settings.templatePath
					const file = this.app.vault.getAbstractFileByPath(path)
					if (file === null)
						new Notice(`Unable to load aside template ${path}`)
					else if (file instanceof TFile)
						yaml = await this.app.vault.cachedRead(file)
				}
				const block = [ '```' + CODEBLOCK_ID, yaml.trim(), '```' ].join('\n')
				editor.replaceRange(block, editor.getCursor())
			}
		});
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		this.saveData(this.settings)
	}

}

class AsideRenderChild extends MarkdownRenderChild {
	app: App
	element: HTMLElement
	sourcePath: string
	sourceText: string

	constructor(app: App, element: HTMLElement, sourcePath: string, sourceText: string) {
		super(element)
		this.app = app
		this.element = element
		this.sourcePath = sourcePath
		this.sourceText = sourceText
	}

	onload() {
		this.render()
		this.registerEvent(this.app.metadataCache.on('changed', this.render.bind(this)))
	}

	render() {
		
		try {
			const yaml: any = parseYaml(this.sourceText)

			this.element.addClass("aside-section")

			console.log(`rendering ${yaml}`)

			if (yaml.thumbnail) {
				MarkdownRenderer.renderMarkdown(yaml.thumbnail, this.element, this.sourcePath, this)
			}

			if (yaml.content) {
				
				const table = this.element.createEl('table')
				table.addClass('aside-content')

				const entries = (yaml.sortContent ?? true)
					? Object.entries(yaml.content).sort()
					: Object.entries(yaml.content);

				entries.forEach(([key, value]) => {
					const str = value instanceof Array 
						? value.join('\n') 
						: String(value)

					if (str) {
						const tr = table.createEl('tr')
						tr.createEl('td', { text: key })
						const td = tr.createEl('td')

						const extra = str
							.replace(/\(.+?\)/g, (it: string) => `<small>${it}</small>`)
							.replace(/\[{2}(.+?#(.+?))\]{2}/g, '[[$1|$2]]')

						MarkdownRenderer.renderMarkdown(extra, td, this.sourcePath, this)
					}
				});
			}
		} 
		catch (ex) {
			const readableError = "Unable to display aside"
			MarkdownRenderer.renderMarkdown(readableError, this.element, this.sourcePath, this)
		}
	}
}