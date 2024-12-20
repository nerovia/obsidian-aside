# Obsidian Aside

> An Obsidian plugin to display aside sections based on frontmatter.

## Installation

You have to install the plugin manually, I'm afraid...

1. Download the `main.js`, `style.css` and `manifest.json` files from the Release section of this repository.
2. Find the `.obsidian/plugins` directory of your vault and create a new subdirectory for this plugin. You can name it `obsidian-aside` or something else, it doesn't matter.
3. Move the files from your download into the new directory.

You should now be able to activate the plugin in your vault.

## Usage

Aside sections are created based on the frontmatter entries of a note.
You can define the following options to customize your aside section.

Note that the aside section is only displayed in the Reading view, and that either `aside-image` or `aside-prefix` have to be defined in the frontmatter.

```yaml
---
# aside options
aside-image: '[[latissa.jpg]]'
aside-prefix: 'about-'
aside-sort: false
aside-hide: false

# aside entries
about-name: Latissa
about-age: 34
about-alias:
 - The Scarred
 - Tiss (by Strix)
about-home:
 - Brineridge
about-affiliations:
 - The Captains Guild
about-allies:
 - [[Min]] (former besties)
 - [[Cordazar]] (first mate)
---

# your note content
```

### Frontmatter

#### `aside-image: string`

Defines an image that is displayed at the top of the aside section. This can be a wiki style link or an image URL.

#### `aside-sort: boolean`

Whether to sort the aside properties alphabetically.

#### `aside-prefix: string`

Defines what frontmatter entries to include in the aside content.
If undefined no items are displayed.

#### `aside-hide: boolean`

Prevent the aside section from being rendered. Default is false.

## Roadmap

- [ ] Improve HTML injection
- [ ] Improve link parsing for image
- [ ] Improve style
- [ ] Add custom styling capabilities
- [ ] Add option to display tags
