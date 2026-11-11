export type Me = {
  id: string; name: string; email: string; avatarUrl: string | null;
  coverUrl: string | null; bio: string | null; instagram: string | null; tiktok: string | null; website: string | null; profilePublic: boolean; nim: string | null; phone: string | null; campus: string | null; major: string | null; batch: string | null;
  role: string; roleName: string; position: string | null;
  division: { id: string; name: string } | null; period: { id: string; name: string } | null; permissions: string[]; divisionGrants: string[]; memberQr: string;
};

export type AttStatus = "HADIR" | "TELAT" | "IZIN" | "SAKIT" | "ALPA";

export type EventItem = {
  id: string; title: string; type: string; startAt: string; endAt: string; lateAfter: string; location: string | null;
  scope: "ALL" | "DIVISION" | "MANUAL"; attendanceStatus: "CLOSED" | "OPEN" | "DONE"; pointHadir: number | null; pointTelat: number | null;
  geofenceOn: boolean; divisionId?: string | null; division?: { name: string } | null; createdBy?: { name: string }; canManage: boolean;
  myAttendance?: AttStatus | null; myLeave?: { status: string; kind: string } | null;
};

export type Counts = { total: number; HADIR: number; TELAT: number; IZIN: number; SAKIT: number; ALPA: number; BELUM: number };
export type AttendanceRow = { userId: string; name: string; nim: string | null; status: AttStatus | null; method: string | null; scannedAt: string | null };
export type Ledger = { id: string; points: number; sourceType: string; note: string | null; createdAt: string };
export type Division = { id: string; name: string; slug: string; description: string | null; _count?: { memberships: number } };

export type BillStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED" | "OVERDUE";
export type Bill = { id: string; planId: string; periodLabel: string; periodName: string; amount: number; dueDate: string; status: BillStatus; plan: { name: string; frequency: string }; user?: { id: string; name: string } };
export type Payment = {
  id: string; amount: number; transferDate: string; proofUrl: string; status: "PENDING" | "VERIFIED" | "REJECTED"; rejectReason: string | null; createdAt: string; updatedAt: string;
  user: { id: string; name: string; nim: string | null }; verifiedBy: { name: string } | null; bills: Bill[];
};
export type BankAccount = { id: string; bankName: string; accountNumber: string; accountName: string; qrisImageUrl: string | null; isActive: boolean };
