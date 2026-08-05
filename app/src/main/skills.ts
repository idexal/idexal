// Idexal — skills (saved prompts)
//
// A skill is a prompt the user keeps: "review this for security", "write
// tests for the file I have open", their own phrasing for the work they do
// every day. Kept as a plain JSON file next to the rest of the user's
// configuration so it can be read, edited, backed up or shared without the
// app — the same reason providers live in a file rather than a database.

import { ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface Skill {
	id: string;
	name: string;
	prompt: string;
}

function skillsPath(): string {
	return path.join(os.homedir(), '.idexal', 'skills.json');
}

/** Shipped with the app so the feature is useful before the user has
 *  written anything. They are seeded once, then owned by the user — the
 *  file is never re-seeded, or edits and deletions would come back. */
const STARTER: Skill[] = [
	{
		id: 'review-security',
		name: 'مراجعة أمنية',
		prompt: 'راجع هذا الكود أمنياً للقراءة فقط: مدخلات غير موثوقة، أسرار مكشوفة، صلاحيات زائدة، وتجاوز مسارات. اذكر كل مشكلة بـ file:line مع إصلاح محدد.',
	},
	{
		id: 'write-tests',
		name: 'اكتب اختبارات',
		prompt: 'اكتب اختبارات للملف المفتوح. غطِّ الحالات الحدّية والفشل، لا المسار السعيد فقط. شغّل الاختبارات وأصلح ما يسقط منها.',
	},
	{
		id: 'explain',
		name: 'اشرح هذا الكود',
		prompt: 'اشرح ما يفعله هذا الكود ولماذا كُتب هكذا. ابدأ بالغرض، ثم التدفق، ثم أي قرار غير بديهي.',
	},
	{
		id: 'why-failing',
		name: 'لماذا يفشل؟',
		prompt: 'شغّل الاختبارات، اقرأ الفشل الحقيقي لا العَرَض، وأصلح السبب الجذري. أرِني الأمر ومخرجاته قبل الإصلاح وبعده.',
	},
];

async function readSkills(): Promise<Skill[]> {
	try {
		const raw = await fs.readFile(skillsPath(), 'utf8');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as Skill[]) : [];
	} catch {
		// Missing file on first run: seed it. A corrupt file is treated the
		// same way rather than throwing — but the original is kept, because
		// silently discarding someone's saved prompts is not recoverable.
		try {
			await fs.mkdir(path.dirname(skillsPath()), { recursive: true });
			await fs.access(skillsPath());
			await fs.rename(skillsPath(), skillsPath() + '.broken');
		} catch {
			/* nothing to preserve */
		}
		await write(STARTER);
		return STARTER;
	}
}

async function write(skills: Skill[]): Promise<void> {
	await fs.mkdir(path.dirname(skillsPath()), { recursive: true });
	await fs.writeFile(skillsPath(), JSON.stringify(skills, null, 2) + '\n', 'utf8');
}

export function registerSkillHandlers(): void {
	ipcMain.handle('skills:list', async () => {
		try {
			return { ok: true, skills: await readSkills(), path: skillsPath() };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('skills:save', async (_e, skill: Skill) => {
		if (!skill?.name?.trim() || !skill?.prompt?.trim()) {
			return { ok: false, error: 'a skill needs a name and a prompt' };
		}
		try {
			const skills = await readSkills();
			const id = skill.id?.trim() || `skill-${Date.now()}`;
			const next = skills.filter((s) => s.id !== id);
			next.push({ id, name: skill.name.trim(), prompt: skill.prompt.trim() });
			await write(next);
			return { ok: true, skills: next };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('skills:delete', async (_e, id: string) => {
		try {
			const skills = (await readSkills()).filter((s) => s.id !== id);
			await write(skills);
			return { ok: true, skills };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});
}
