<script lang="ts">
import type {
	ParsedTimetableData,
	TimetableCourseArrangement,
	TimetableViewModel,
} from "../../types/timetable";
import { buildTimetableViewModel } from "../../utils/timetable-normalizer";
import {
	parseTimetableText,
	serializeTimetableDataToFileText,
} from "../../utils/timetable-parser";

export let viewModel: TimetableViewModel;
export let baselineText: string;

const dayLabels: Record<number, string> = {
	1: "周一",
	2: "周二",
	3: "周三",
	4: "周四",
	5: "周五",
	6: "周六",
	7: "周日",
};

const visibleDays = viewModel.dayColumns.map((column) => column.day);
const maxNode = Math.max(...viewModel.nodeRows.map((row) => row.node), 1);

let baselineParsed: ParsedTimetableData;
try {
	baselineParsed = parseTimetableText(baselineText);
} catch (error) {
	throw new Error(error instanceof Error ? error.message : "课表基线数据解析失败");
}

let editMode = false;
let draftParsed = cloneParsedData(baselineParsed);
let previewViewModel = buildTimetableViewModel(draftParsed, viewModel.currentWeek);
let selectedArrangementRef: number | null = null;
let validationError = "";
let isDirty = false;

type ArrangementCardItem = {
	arrangementIndex: number;
	title: string;
	teacher: string;
	room: string;
	nodeText: string;
	weekText: string;
	color: string;
};

type ArrangementCardGroup = {
	day: number;
	label: string;
	items: ArrangementCardItem[];
};

let arrangementCards: ArrangementCardGroup[] = [];
let selectedArrangement: TimetableCourseArrangement | null = null;
let selectedCourseName = "";

$: arrangementCards = buildArrangementCards(previewViewModel, draftParsed.arrangements);
$: selectedArrangement =
	selectedArrangementRef === null
		? null
		: draftParsed.arrangements[selectedArrangementRef] ?? null;
$: selectedCourseName = selectedArrangement
	? draftParsed.courseDefinitions.find((course) => course.id === selectedArrangement?.id)
			?.courseName || ""
	: "";

function cloneParsedData(data: ParsedTimetableData): ParsedTimetableData {
	return {
		config: structuredClone(data.config),
		nodeTimes: structuredClone(data.nodeTimes),
		meta: structuredClone(data.meta),
		courseDefinitions: structuredClone(data.courseDefinitions),
		arrangements: structuredClone(data.arrangements),
	};
}

function buildArrangementCards(
	currentViewModel: TimetableViewModel,
	arrangements: TimetableCourseArrangement[],
): ArrangementCardGroup[] {
	return currentViewModel.dayColumns.map((dayColumn) => {
		const cards = currentViewModel.coursesByDay[dayColumn.day] ?? [];
		const items = cards
			.map((courseView) => {
				const arrangementIndex = arrangements.findIndex(
					(arrangement) =>
						arrangement.id === courseView.courseId &&
						arrangement.day === courseView.day &&
						arrangement.startNode === courseView.startNode &&
						arrangement.startWeek === courseView.startWeek &&
						arrangement.endWeek === courseView.endWeek,
				);

				if (arrangementIndex < 0) {
					return null;
				}

				return {
					arrangementIndex,
					title: courseView.courseName,
					teacher: courseView.teacher,
					room: courseView.room,
					nodeText: courseView.nodeText,
					weekText: `${courseView.startWeek}-${courseView.endWeek}周`,
					color: courseView.color,
				};
			})
			.filter((item): item is ArrangementCardItem => Boolean(item));

		return {
			day: dayColumn.day,
			label: dayLabels[dayColumn.day] ?? dayColumn.label,
			items,
		};
	});
}

function enterEditMode() {
	draftParsed = cloneParsedData(baselineParsed);
	previewViewModel = buildTimetableViewModel(draftParsed, viewModel.currentWeek);
	selectedArrangementRef = null;
	validationError = "";
	isDirty = false;
	editMode = true;
}

function cancelEditMode() {
	restoreBaselineAndExit();
}

function restoreBaselineAndExit() {
	draftParsed = cloneParsedData(baselineParsed);
	previewViewModel = buildTimetableViewModel(draftParsed, viewModel.currentWeek);
	selectedArrangementRef = null;
	validationError = "";
	isDirty = false;
	editMode = false;
}

function selectArrangement(index: number) {
	selectedArrangementRef = index;
	validationError = "";
}

function updateSelectedArrangement(
	field: "teacher" | "room" | "day" | "startNode" | "startWeek" | "endWeek",
	value: string,
) {
	if (selectedArrangementRef === null) {
		return;
	}

	const arrangement = draftParsed.arrangements[selectedArrangementRef];
	if (!arrangement) {
		return;
	}

	if (field === "teacher" || field === "room") {
		arrangement[field] = value;
	} else {
		const nextValue = Number(value);
		if (!Number.isFinite(nextValue)) {
			return;
		}
		(arrangement as Record<string, unknown>)[field] = Math.floor(nextValue);
	}

	afterDraftChange();
}

function updateCourseName(value: string) {
	if (!selectedArrangement) {
		return;
	}
	const courseDef = draftParsed.courseDefinitions.find(
		(course) => course.id === selectedArrangement?.id,
	);
	if (!courseDef) {
		return;
	}
	courseDef.courseName = value;
	afterDraftChange();
}

function afterDraftChange() {
	validationError = validateDraft(draftParsed);
	previewViewModel = buildTimetableViewModel(draftParsed, viewModel.currentWeek);
	isDirty = true;
}

function validateDraft(data: ParsedTimetableData): string {
	const maxWeek = Math.max(1, data.meta.maxWeek || 1);

	for (let index = 0; index < data.arrangements.length; index += 1) {
		const arrangement = data.arrangements[index];
		if (arrangement.day < 1 || arrangement.day > 7) {
			return `第 ${index + 1} 条课程安排的星期超出范围（1-7）`;
		}
		if (!visibleDays.includes(arrangement.day)) {
			return `第 ${index + 1} 条课程安排的星期不在当前课表显示范围内`;
		}
		if (arrangement.startNode < 1 || arrangement.startNode > maxNode) {
			return `第 ${index + 1} 条课程安排的起始节次超出范围（1-${maxNode}）`;
		}
		if (arrangement.startWeek < 1 || arrangement.endWeek < 1) {
			return `第 ${index + 1} 条课程安排的周次必须大于等于 1`;
		}
		if (arrangement.startWeek > arrangement.endWeek) {
			return `第 ${index + 1} 条课程安排的起止周非法（开始周不能大于结束周）`;
		}
		if (arrangement.endWeek > maxWeek) {
			return `第 ${index + 1} 条课程安排的结束周超出最大周次 ${maxWeek}`;
		}
		const courseDef = data.courseDefinitions.find(
			(course) => course.id === arrangement.id,
		);
		if (!courseDef || !courseDef.courseName?.trim()) {
			return `第 ${index + 1} 条课程安排关联课程名为空`;
		}
	}

	for (const course of data.courseDefinitions) {
		if (!course.courseName?.trim()) {
			return `课程定义 #${course.id} 的课程名不能为空`;
		}
	}

	return "";
}

function resetDraft() {
	draftParsed = cloneParsedData(baselineParsed);
	previewViewModel = buildTimetableViewModel(draftParsed, viewModel.currentWeek);
	selectedArrangementRef = null;
	validationError = "";
	isDirty = false;
}

function exportJson() {
	const error = validateDraft(draftParsed);
	if (error) {
		validationError = error;
		return;
	}

	validationError = "";
	const text = serializeTimetableDataToFileText(draftParsed);
	const blob = new Blob([text], { type: "application/json;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${baselineParsed.meta.tableName || "timetable"}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);

	restoreBaselineAndExit();
}

function getNumberValue(value: number | undefined): string {
	return Number.isFinite(value) ? String(value) : "";
}
</script>

<div class="mb-5 flex items-center gap-2">
	{#if editMode}
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
			on:click={cancelEditMode}
		>
			退出编辑
		</button>
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
			on:click={resetDraft}
			disabled={!isDirty}
		>
			重置
		</button>
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
			on:click={exportJson}
		>
			导出 JSON
		</button>
	{:else}
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
			on:click={enterEditMode}
		>
			编辑课表
		</button>
	{/if}
</div>

{#if editMode}
	<div class="mb-4 rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs">
		当前为临时编辑模式：导出后将自动退出并恢复原始课表展示。
	</div>

	{#if validationError}
		<div class="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm">
			{validationError}
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
		<section class="card-surface p-4">
			<h3 class="mb-3 text-sm font-semibold">可视化课程列表（当前周）</h3>
			<div class="grid gap-3 md:grid-cols-2">
				{#each arrangementCards as dayGroup}
					<div class="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
						<div class="mb-2 text-sm font-medium">{dayGroup.label}</div>
						{#if dayGroup.items.length === 0}
							<p class="text-xs opacity-70">本日暂无课程</p>
						{:else}
							<div class="flex flex-col gap-2">
								{#each dayGroup.items as item}
									<button
										type="button"
										class={`w-full rounded-lg border px-3 py-2 text-left transition ${selectedArrangementRef === item.arrangementIndex ? "border-blue-500 bg-blue-500/10" : "border-zinc-200 dark:border-zinc-700 hover:border-blue-500/50"}`}
										on:click={() => selectArrangement(item.arrangementIndex)}
									>
										<div class="mb-1 text-sm font-semibold" style={item.color ? `color:${item.color}` : undefined}>{item.title}</div>
										<div class="text-xs opacity-70">{item.nodeText} · {item.weekText}</div>
										<div class="text-xs opacity-60">{item.teacher} / {item.room}</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<section class="card-surface p-4">
			<h3 class="mb-3 text-sm font-semibold">属性编辑面板</h3>
			{#if selectedArrangement}
				<div class="space-y-3">
					<label class="block text-xs opacity-80">
						<span class="mb-1 block">课程名</span>
						<input
							type="text"
							class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
							value={selectedCourseName}
							on:input={(event) => updateCourseName(event.currentTarget.value)}
						/>
					</label>

					<label class="block text-xs opacity-80">
						<span class="mb-1 block">教师</span>
						<input
							type="text"
							class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
							value={selectedArrangement.teacher ?? ""}
							on:input={(event) => updateSelectedArrangement("teacher", event.currentTarget.value)}
						/>
					</label>

					<label class="block text-xs opacity-80">
						<span class="mb-1 block">教室</span>
						<input
							type="text"
							class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
							value={selectedArrangement.room ?? ""}
							on:input={(event) => updateSelectedArrangement("room", event.currentTarget.value)}
						/>
					</label>

					<label class="block text-xs opacity-80">
						<span class="mb-1 block">星期</span>
						<select
							class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
							value={getNumberValue(selectedArrangement.day)}
							on:change={(event) => updateSelectedArrangement("day", event.currentTarget.value)}
						>
							{#each visibleDays as day}
								<option value={day}>{dayLabels[day]}</option>
							{/each}
						</select>
					</label>

					<label class="block text-xs opacity-80">
						<span class="mb-1 block">起始节</span>
						<input
							type="number"
							min="1"
							max={String(maxNode)}
							class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
							value={getNumberValue(selectedArrangement.startNode)}
							on:input={(event) => updateSelectedArrangement("startNode", event.currentTarget.value)}
						/>
					</label>

					<div class="grid grid-cols-2 gap-2">
						<label class="block text-xs opacity-80">
							<span class="mb-1 block">起始周</span>
							<input
								type="number"
								min="1"
								max={String(draftParsed.meta.maxWeek)}
								class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
								value={getNumberValue(selectedArrangement.startWeek)}
								on:input={(event) => updateSelectedArrangement("startWeek", event.currentTarget.value)}
							/>
						</label>

						<label class="block text-xs opacity-80">
							<span class="mb-1 block">结束周</span>
							<input
								type="number"
								min="1"
								max={String(draftParsed.meta.maxWeek)}
								class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm"
								value={getNumberValue(selectedArrangement.endWeek)}
								on:input={(event) => updateSelectedArrangement("endWeek", event.currentTarget.value)}
							/>
						</label>
					</div>
				</div>
			{:else}
				<p class="text-sm opacity-80">请先在左侧点击一条课程卡片后再编辑。</p>
			{/if}
		</section>
	</div>
{:else}
	<div class="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs opacity-80">
		点击"编辑课表"进入图形化编辑模式，导出后会自动还原页面临时修改。
	</div>
{/if}
