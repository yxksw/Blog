#!/usr/bin/env node
/**
 * 生成文章 Git 历史 JSON 文件
 * 用于文章修订历史功能
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = 'src/content/blog';
const OUTPUT_FILE = 'src/json/git-history.json';

/**
 * 获取文件的 git 提交历史
 * @param {string} filePath - 文件路径
 * @returns {Array} 提交历史数组
 */
function getFileGitHistory(filePath) {
    try {
        // 使用 git log 获取文件历史
        // 格式: hash|date|message
        const output = execSync(
            `git log --follow --format="%H|%aI|%s" -- "${filePath}"`,
            { encoding: 'utf-8', cwd: process.cwd() }
        );

        if (!output.trim()) {
            return [];
        }

        return output
            .trim()
            .split('\n')
            .map(line => {
                const [hash, date, ...messageParts] = line.split('|');
                return {
                    hash: hash.substring(0, 7),
                    fullHash: hash,
                    date: formatDate(date),
                    message: messageParts.join('|')
                };
            });
    } catch (error) {
        console.warn(`Warning: Could not get git history for ${filePath}:`, error.message);
        return [];
    }
}

/**
 * 格式化日期
 * @param {string} isoDate - ISO 格式日期
 * @returns {string} 格式化后的日期
 */
function formatDate(isoDate) {
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return isoDate;
    }
}

/**
 * 主函数
 */
function main() {
    console.log('Generating git history...');

    try {
        // 获取所有博客文章文件
        const output = execSync(
            `git ls-files "${BLOG_DIR}/*.md" "${BLOG_DIR}/*.mdx"`,
            { encoding: 'utf-8', cwd: process.cwd() }
        );

        const files = output.trim().split('\n').filter(Boolean);
        const historyMap = {};

        for (const file of files) {
            // 获取文件名（不含路径）
            const fileName = file.split('/').pop();
            
            // 获取文件历史
            const history = getFileGitHistory(file);
            
            if (history.length > 0) {
                historyMap[fileName] = history;
                console.log(`✓ ${fileName}: ${history.length} commits`);
            }
        }

        // 确保输出目录存在
        const outputDir = dirname(OUTPUT_FILE);
        mkdirSync(outputDir, { recursive: true });

        // 写入 JSON 文件
        writeFileSync(
            OUTPUT_FILE,
            JSON.stringify(historyMap, null, 2),
            'utf-8'
        );

        console.log(`\nGit history generated: ${OUTPUT_FILE}`);
        console.log(`Total files: ${Object.keys(historyMap).length}`);
    } catch (error) {
        console.error('Error generating git history:', error.message);
        process.exit(1);
    }
}

main();
