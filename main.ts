import { App, MarkdownPostProcessorContext, MarkdownRenderer, Plugin, PluginSettingTab, Setting } from 'obsidian';

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
		this.registerEvent(this.app.workspace.on('resize', this.onResize.bind(this)));

		// subscribe to post processor
		this.registerMarkdownPostProcessor(this.onProcessAside.bind(this));
	}

	onResize() {
		this.app.workspace.containerEl.querySelectorAll('.markdown-reading-view').forEach(it => {
			const bounds = it.getBoundingClientRect()
			if (bounds.width > 600)
				it.addClass('aside-wide')
			else
				it.removeClass('aside-wide')
		})
	}

	onProcessAside(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
			
		// on frontmatter update the following element should exist.
		// this is a hack, but i honestly don't how to do this otherwise.
		if (!el.querySelector('.frontmatter .language-yaml')) 
			return;
		
		// abort if there's no frontmatter
		if (!ctx.frontmatter)
			return;
		
		// get options for the aside
		const { 
			'aside-show':show, 
			'aside-sort':sort = true, 
			'aside-img':imgLink = null,
			'aside-prefix':prefix = '',
		} = ctx.frontmatter; 
		
		// abort if the aside is explicitly hidden
		if (show === false)
			return;
		
		// abort if the aside is not implicitly shown.
		if (!show && !prefix)
			return;
		
		// i'd rather make a new sibling, but i don't know how.
		// so i guess we're just hijacking this container for now...
		el.addClass('frontmatter-aside')

		// append portrait image if one is present
		if (imgLink) {
			this.appendAsideImg(el, imgLink, ctx.sourcePath);
		}

		// filter attributes based on prefix
		let attributes = Object.entries(ctx.frontmatter)
			.filter(([k]) => !k.startsWith('aside-'))
			.filter(([k]) => k.startsWith(prefix));

		// sort attributes if specified
		if (sort) {
			attributes = attributes.sort(([a], [b]) => a.localeCompare(b));
		}

		// create content table
		const contentEl = el.createEl('table', { cls: 'aside-content' })

		// append attributes to table
		for (const [key, value] of attributes) {
			const name = key.substring(prefix.length);
			this.appendAsideAttribute(contentEl, name, value, ctx.sourcePath);
		}
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
