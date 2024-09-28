import { App, MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownRenderer, Plugin, PluginSettingTab, Setting } from 'obsidian';

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
		this.app.workspace.containerEl.querySelectorAll('div.aside-container').forEach(it => {
			// Toggle compact aside style
			const leafWidth = it.parentElement?.getBoundingClientRect()?.width ?? 0;
			it.toggleClass('aside-compact', leafWidth > 400);

			// Toggle compact content style
			const asideWidth = it.getBoundingClientRect().width;
			const content = it.querySelector('.aside-content');
			content?.toggleClass('aside-compact', asideWidth < 200)
		})
	}

	onProcessAside(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
			
		// on frontmatter update the following element should exist.
		// this is a hack, but i honestly don't how to do this otherwise.
		if (!el.querySelector('.frontmatter .language-yaml')) 
			return;
		
		const aside = AsideOptions.fromFrontmatter(ctx.frontmatter);

		if (!aside) return;
		
		// abort if the aside is explicitly hidden
		if (aside.show === false)
			return;
		
		// abort if the aside is not implicitly shown.
		if (!aside.show && !aside.prefix)
			return;

		
		ctx.addChild(new AsideRenderChild(this.app, el, ctx.sourcePath, aside));
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		this.saveData(this.settings)
	}

}


class AsideOptions {
	show: boolean | null;
	sort: boolean;
	prefix: string;
	imageLink: string | null;
	attributes: [string, unknown][]
	
	static fromFrontmatter(frontmatter: any): AsideOptions | null {
		if (!frontmatter)
			return null;
		
		const { 
			'aside-show':show = null, 
			'aside-sort':sort = true, 
			'aside-image':imageLink = null,
			'aside-prefix':prefix = '',
		} = frontmatter; 
		
		// filter attributes based on prefix
		let attributes = Object.entries(frontmatter)
			.filter(([k]) => !k.startsWith('aside-'))
			.filter(([k]) => k.startsWith(prefix))
			.map(([k,v]): [string, unknown] => [k.substring(prefix.length),v]);

		// sort attributes if specified
		if (sort) {
			attributes = attributes.sort(([a], [b]) => a.localeCompare(b));
		}

		return { 
			show: show,
			sort: sort,
			imageLink: imageLink,
			prefix: prefix,
			attributes: attributes,
		}
	}
}

class AsideRenderChild extends MarkdownRenderChild {
	app: App;
	sourcePath: string;
	options: AsideOptions;

	constructor(app: App, containerEl: HTMLElement, sourcePath: string, options: AsideOptions) {
		super(containerEl);
		this.app = app;
		this.sourcePath = sourcePath;
		this.options = options;
	}

	override onload(): void { this.render(); }

	override onunload(): void { }

	render() {
			
		// i'd rather make a new sibling, but i don't know how.
		// so i guess we're just hijacking this container for now...
		this.containerEl.addClass('aside-container', 'aside-compact');

		// append portrait image if one is present
		if (this.options.imageLink) {
			this.appendAsideImg(this.containerEl, this.options.imageLink);
		}

		// create content table
		const contentEl = this.containerEl.createEl('table', { cls: 'aside-content' })

		// append attributes to table
		for (const [name, value] of this.options.attributes) {
			this.appendAsideAttribute(contentEl, name, value);
		}
	}

	appendAsideImg(el: HTMLElement, imgLink: string) {
		const imgPath = this.getResourceFromLink(imgLink);
		if (imgPath) {
			el.createEl('img', { attr: { src: imgPath } })
		}
	}

	appendAsideAttribute(el: HTMLElement, name: string, value: unknown) {
		const tr = el.createEl('tr')
		tr.createEl('td').createEl('p', { text: name });
		const td = tr.createEl('td');

		const values = Array.isArray(value) ? value : [value];

		values.filter(it => it).forEach(it => {
			const div = document.createElement('div');
			const str = String(it)
				.replace(/\[{2}(.+?#(.+?))\]{2}/g, '[[$1|$2]]');
			MarkdownRenderer.renderMarkdown(str, div, this.sourcePath, this)
			td.appendChild(div);
		});
	}

	getResourceFromLink(linktext: string): string | null {
		const path = /\[{2}(.+?)\]{2}/.exec(linktext)?.[1];
		if (!path) return null;
		const file = app.metadataCache.getFirstLinkpathDest(path, this.sourcePath);
		if (!file) return null;
		return app.vault.getResourcePath(file);
	}
}
