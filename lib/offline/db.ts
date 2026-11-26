import Dexie, { type Table } from "dexie";

export type SavedLesson = {
  id: string;
  tenantId: string;
  studentId: string;
  title: string;
  description: string | null;
  htmlContent: string;
  pdfUrls: string[];
  savedAt: string;
};

class TerraLearnOfflineDatabase extends Dexie {
  saved_lessons!: Table<SavedLesson, [string, string, string]>;

  constructor() {
    super("TerraLearnOffline");
    this.version(1).stores({
      saved_lessons:
        "&[tenantId+studentId+id], tenantId, studentId, [tenantId+studentId], savedAt, [tenantId+studentId+savedAt]",
    });
    this.version(2)
      .stores({
        saved_lessons:
          "&[tenantId+studentId+id], tenantId, studentId, [tenantId+studentId], savedAt, [tenantId+studentId+savedAt]",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("saved_lessons")
          .toCollection()
          .modify((lesson: SavedLesson) => {
            lesson.pdfUrls = [];
          });
      });
  }
}

export const offlineDb = new TerraLearnOfflineDatabase();
