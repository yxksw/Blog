import { access, constants, copyFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const distClientDir = resolve(process.cwd(), 'dist/client');
const sitemapPath = resolve(distDir, 'sitemap.xml');
const sitemapIndexPath = resolve(distDir, 'sitemap-index.xml');
const clientSitemapPath = resolve(distClientDir, 'sitemap.xml');
const clientSitemapIndexPath = resolve(distClientDir, 'sitemap-index.xml');

const exists = async (path) => {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};

const ensureNonEmpty = async (path) => {
	const fileStat = await stat(path);
	if (!fileStat.isFile() || fileStat.size <= 0) {
		throw new Error(`Invalid sitemap file: ${path}`);
	}
};

// Check root dist first
if (await exists(sitemapPath)) {
	await ensureNonEmpty(sitemapPath);
	process.exit(0);
}

if (await exists(sitemapIndexPath)) {
	await ensureNonEmpty(sitemapIndexPath);
	await copyFile(sitemapIndexPath, sitemapPath);
	await ensureNonEmpty(sitemapPath);
	process.exit(0);
}

// Check dist/client (for Vercel adapter)
if (await exists(clientSitemapPath)) {
	await ensureNonEmpty(clientSitemapPath);
	await copyFile(clientSitemapPath, sitemapPath);
	await ensureNonEmpty(sitemapPath);
	process.exit(0);
}

if (await exists(clientSitemapIndexPath)) {
	await ensureNonEmpty(clientSitemapIndexPath);
	await copyFile(clientSitemapIndexPath, sitemapPath);
	await ensureNonEmpty(sitemapPath);
	process.exit(0);
}

const files = await readdir(distDir).catch(() => []);
const clientFiles = await readdir(distClientDir).catch(() => []);
const sitemapFiles = [
	...files.filter((name) => /^sitemap.*\.xml$/i.test(name)),
	...clientFiles.filter((name) => /^sitemap.*\.xml$/i.test(name)).map(name => `client/${name}`)
];
throw new Error(
	`dist/sitemap-index.xml is missing. Found sitemap files: ${sitemapFiles.length ? sitemapFiles.join(', ') : '(none)'}`
);
