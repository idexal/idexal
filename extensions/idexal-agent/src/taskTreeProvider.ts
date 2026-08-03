// Idexal Agent extension — visual task list (tree view)
// Shows the current task as the root and its plan steps as children, with
// status icons that update live as the AI Core emits events.

import * as vscode from 'vscode';
import type { TaskStep, TaskStepStatus } from './types';
import { STEP_ICONS } from './aiCoreClient';

const STATUS_LABEL: Record<TaskStepStatus, string> = {
	pending: 'pending',
	running: 'running',
	done: 'done',
	failed: 'failed',
};

export class TaskNode extends vscode.TreeItem {
	constructor(
		public readonly task: string,
		public readonly startedAt: Date,
	) {
		super(task, vscode.TreeItemCollapsibleState.Expanded);
		this.iconPath = new vscode.ThemeIcon('sparkle');
		this.description = startedAt.toLocaleTimeString();
		this.contextValue = 'idexalTask';
		this.tooltip = task;
	}
}

export class StepNode extends vscode.TreeItem {
	constructor(public readonly step: TaskStep) {
		super(`Step ${step.id}: ${step.description}`, vscode.TreeItemCollapsibleState.None);
		this.iconPath = STEP_ICONS[step.status];
		this.description = STATUS_LABEL[step.status];
		this.contextValue = 'idexalStep';
		const lines = [`Step ${step.id} — ${STATUS_LABEL[step.status]}`];
		if (step.assignee) lines.push(`Assigned to: ${step.assignee}`);
		if (step.result) lines.push(`\n${step.result.slice(0, 500)}`);
		this.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
	}
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TaskNode | StepNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<TaskNode | StepNode | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private task: TaskNode | undefined;
	private steps: TaskStep[] = [];
	private running = false;

	/** Start showing a new task (empty step list until the plan arrives). */
	begin(task: string): void {
		this.task = new TaskNode(task, new Date());
		this.steps = [];
		this.running = true;
		this.refresh();
	}

	/** Replace the step list with the planner's output. */
	setSteps(steps: TaskStep[]): void {
		this.steps = steps;
		this.refresh();
	}

	/** Update a single step's status/result as agents progress. */
	updateStep(step: TaskStep): void {
		const idx = this.steps.findIndex((s) => s.id === step.id);
		if (idx >= 0) {
			this.steps[idx] = step;
		} else {
			this.steps.push(step);
		}
		this.refresh();
	}

	/** Mark the task finished (all steps done/failed). */
	finish(): void {
		this.running = false;
		this.refresh();
	}

	/** Whether a task is currently running (drives the cancel button). */
	isRunning(): boolean {
		return this.running;
	}

	/** Clear the whole list. */
	clear(): void {
		this.task = undefined;
		this.steps = [];
		this.running = false;
		this.refresh();
	}

	getTreeItem(element: TaskNode | StepNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TaskNode | StepNode): (TaskNode | StepNode)[] {
		if (element instanceof StepNode) {
			return [];
		}
		if (element instanceof TaskNode) {
			return this.steps.map((s) => new StepNode(s));
		}
		// Root level
		return this.task ? [this.task] : [];
	}

	private refresh(element?: TaskNode | StepNode): void {
		this._onDidChangeTreeData.fire(element);
	}
}
