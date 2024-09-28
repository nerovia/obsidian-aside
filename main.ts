import { App, MarkdownRenderChild, MarkdownRenderer, Plugin, PluginSettingTab, Setting, parseYaml } from 'obsidian';

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
		const { containerEl } = this

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

		this.registerMarkdownPostProcessor((el, ctx) => {
			
			// on frontmatter update the following element should exist.
			// this is a hack but honestly, i don't know what to do.
			if (!el.querySelector('.frontmatter .language-yaml')) 
				return;
			
			if (!ctx.frontmatter)
				return;

			const { 
				'aside-show':show, 
				'aside-sort':sort = true, 
				'aside-img':imgLink = null,
				'aside-prefix':prefix = '',
			} = ctx.frontmatter; 

			if (show === false)
				return;

			if (!show && !prefix)
				return;


			// not a fan of this either, but it has to be done.
			el.addClass('frontmatter-aside')

			if (imgLink) {
				this.appendAsideImg(el, imgLink, ctx.sourcePath);
			}

			let attributes = Object.entries(ctx.frontmatter)
				.filter(([k]) => !k.startsWith('aside-'))
				.filter(([k]) => k.startsWith(prefix));

			if (sort) {
				attributes = attributes.sort(([a], [b]) => a.localeCompare(b));
			}

			const contentEl = el.createEl('table', { cls: 'aside-content' })

			for (const [key, value] of attributes) {
				const name = key.substring(prefix.length);
				this.appendAsideAttribute(contentEl, name, value, ctx.sourcePath);
			}

		});
	}

	appendAsideImg(el: HTMLElement, imgLink: string, sourcePath: string) {
		const imgPath = this.getResourceFromLink(imgLink, sourcePath);
		if (imgPath) {
			el.createEl('img', { attr: { src: imgPath } })
		}
	}

	appendAsideAttribute(el: HTMLElement, name: string, value: unknown, sourcePath: string) {
		const tr = el.createEl('tr')
		tr.createEl('td', { text: name });
		const td = tr.createEl('td');

		const values = Array.isArray(value) ? value : [value];

		values.filter(it => it).forEach(it => {
			const div = document.createElement('div');
			MarkdownRenderer.renderMarkdown(String(it), div, sourcePath, null!)
			td.appendChild(div);
		});
	}

	getResourceFromLink(linktext: string, sourcePath: string): string | null {
		const path = /\[{2}(.+?)\]{2}/.exec(linktext)?.[1];
		if (!path) return null;
		const file = app.metadataCache.getFirstLinkpathDest(path, sourcePath);
		if (!file) return null;
		return app.vault.getResourcePath(file);
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		this.saveData(this.settings)
	}
}
