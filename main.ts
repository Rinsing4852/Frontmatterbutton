import {
	addIcon,
	App,
	moment,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

interface FrontmatterButtonSettings {
	defaultFrontmatterTemplate: string;
	dateFormat: string;
	preventDuplicateFrontmatter: boolean;
	enableExcludedFolders: boolean;
	excludedFolders: string[];
}

const DEFAULT_FRONTMATTER_TEMPLATE = `---
created: {{date}}
updated: {{date}}
type: inbox
status: unprocessed
source: manual
processed: false
tags: []
---`;

const DEFAULT_SETTINGS: FrontmatterButtonSettings = {
	defaultFrontmatterTemplate: DEFAULT_FRONTMATTER_TEMPLATE,
	dateFormat: "YYYY-MM-DD",
	preventDuplicateFrontmatter: true,
	enableExcludedFolders: false,
	excludedFolders: [],
};

const FRONTMATTER_BUTTON_ICON = "frontmatter-button-file-plus";
const FRONTMATTER_BUTTON_ICON_SVG = `
<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
	<path d="M58 8H25a8 8 0 0 0-8 8v67a8 8 0 0 0 8 8h50a8 8 0 0 0 8-8V33z" />
	<path d="M58 8v25h25" />
	<path d="M50 50v25" />
	<path d="M38 63h25" />
</g>`;

export default class FrontmatterButtonPlugin extends Plugin {
	settings: FrontmatterButtonSettings;

	async onload() {
		await this.loadSettings();
		addIcon(FRONTMATTER_BUTTON_ICON, FRONTMATTER_BUTTON_ICON_SVG);

		this.addCommand({
			id: "add-default-frontmatter",
			name: "Add default frontmatter to current note",
			icon: FRONTMATTER_BUTTON_ICON,
			callback: () => {
				void this.addDefaultFrontmatterToCurrentNote();
			},
		});

		this.addSettingTab(new FrontmatterButtonSettingTab(this.app, this));
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		const settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		this.settings = {
			defaultFrontmatterTemplate:
				typeof settings.defaultFrontmatterTemplate === "string"
					? settings.defaultFrontmatterTemplate
					: DEFAULT_SETTINGS.defaultFrontmatterTemplate,
			dateFormat:
				typeof settings.dateFormat === "string" && settings.dateFormat.trim().length > 0
					? settings.dateFormat
					: DEFAULT_SETTINGS.dateFormat,
			preventDuplicateFrontmatter:
				typeof settings.preventDuplicateFrontmatter === "boolean"
					? settings.preventDuplicateFrontmatter
					: DEFAULT_SETTINGS.preventDuplicateFrontmatter,
			enableExcludedFolders:
				typeof settings.enableExcludedFolders === "boolean"
					? settings.enableExcludedFolders
					: DEFAULT_SETTINGS.enableExcludedFolders,
			excludedFolders: Array.isArray(settings.excludedFolders)
				? (settings.excludedFolders as unknown[]).filter(
						(folder): folder is string => typeof folder === "string"
					)
				: DEFAULT_SETTINGS.excludedFolders,
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async addDefaultFrontmatterToCurrentNote() {
		try {
			const file = this.app.workspace.getActiveFile();

			if (!this.isMarkdownFile(file)) {
				new Notice("No active Markdown file.");
				return;
			}

			if (this.isInExcludedFolder(file)) {
				new Notice("Folder is excluded from frontmatter updates.");
				return;
			}

			const content = await this.app.vault.read(file);

			if (this.startsWithYamlFrontmatter(content)) {
				new Notice("Note already has frontmatter.");
				return;
			}

			const frontmatter = this.renderTemplate(file);
			if (!this.startsWithYamlFrontmatter(frontmatter)) {
				new Notice("Error adding frontmatter.");
				return;
			}

			const separator = content.length > 0 && !frontmatter.endsWith("\n") ? "\n" : "";
			const updatedContent = `${frontmatter}${separator}${content}`;

			await this.app.vault.modify(file, updatedContent);
			new Notice("Frontmatter added successfully.");
		} catch (error) {
			console.error("Error adding frontmatter", error);
			new Notice("Error adding frontmatter.");
		}
	}

	private isMarkdownFile(file: TFile | null): file is TFile {
		return file instanceof TFile && file.extension.toLowerCase() === "md";
	}

	private startsWithYamlFrontmatter(content: string): boolean {
		return /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
	}

	private isInExcludedFolder(file: TFile): boolean {
		if (!this.settings.enableExcludedFolders) {
			return false;
		}

		return this.settings.excludedFolders.some((folder) => {
			const normalizedFolder = this.normalizeFolderPath(folder);
			return (
				normalizedFolder.length > 0 &&
				(file.path === normalizedFolder || file.path.startsWith(`${normalizedFolder}/`))
			);
		});
	}

	private normalizeFolderPath(folder: string): string {
		return folder.trim().replace(/^\/+|\/+$/g, "");
	}

	private renderTemplate(file: TFile): string {
		const now = moment();
		const title = file.basename;

		return this.settings.defaultFrontmatterTemplate
			.replace(/{{date}}/g, now.format(this.settings.dateFormat || "YYYY-MM-DD"))
			.replace(/{{title}}/g, title)
			.replace(/{{time}}/g, now.format("HH:mm"));
	}
}

class FrontmatterButtonSettingTab extends PluginSettingTab {
	plugin: FrontmatterButtonPlugin;

	constructor(app: App, plugin: FrontmatterButtonPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Frontmatter Button" });

		new Setting(containerEl)
			.setName("Default frontmatter template")
			.setDesc("YAML frontmatter to prepend when the command runs.")
			.addTextArea((text) => {
				text
					.setPlaceholder(DEFAULT_FRONTMATTER_TEMPLATE)
					.setValue(this.plugin.settings.defaultFrontmatterTemplate)
					.onChange(async (value) => {
						this.plugin.settings.defaultFrontmatterTemplate = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 10;
				text.inputEl.cols = 40;
			});

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Format used for {{date}}.")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value.trim() || "YYYY-MM-DD";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Prevent duplicate frontmatter")
			.setDesc("Do nothing when the note already starts with YAML frontmatter.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.preventDuplicateFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.preventDuplicateFrontmatter = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable excluded folders")
			.setDesc("Skip notes inside the folders listed below.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableExcludedFolders)
					.onChange(async (value) => {
						this.plugin.settings.enableExcludedFolders = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc("One folder path per line, relative to the vault root.")
			.addTextArea((text) => {
				text
					.setPlaceholder("Templates\nArchive")
					.setValue(this.plugin.settings.excludedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split("\n")
							.map((folder) => folder.trim())
							.filter((folder) => folder.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 5;
				text.inputEl.cols = 40;
			});
	}
}
