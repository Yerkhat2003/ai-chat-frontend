export type Chat = {
  id: string;
  title: string;
  userId: string;
  pinnedMessageId?: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  content: string;
  role: 'USER' | 'AI';
  chatId: string;
  isEdited?: boolean;
  editedAt?: string | null;
  createdAt: string;
};

export type MessageEdit = {
  id: string;
  messageId: string;
  previousContent: string;
  editedAt: string;
};

export type ChatWithMessages = Chat & {
  messages: Message[];
};

export type SharedChatWithMessages = {
  id: string;
  title: string;
  pinnedMessageId?: string | null;
  createdAt: string;
  messages: Message[];
};

export type PaginatedChats = {
  items: Chat[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type AdminStats = {
  kpis: {
    totalUsers: number;
    totalAdmins: number;
    totalSuperadmins?: number;
    totalChats: number;
    totalMessages: number;
  };
  distributions: {
    roles: Array<{ name: string; value: number }>;
    messageRoles: Array<{ name: string; value: number }>;
  };
  activity: {
    dailyMessages: Array<{ date: string; messages: number }>;
  };
  rankings: {
    topChats: Array<{ id: string; title: string; messages: number }>;
    topUsers: Array<{ id: string; email: string; chats: number }>;
  };
  systemHealth: number;
  generatedAt: string;
};

export type PermissionItem = {
  id: string;
  key: string;
  description: string | null;
};

export type AdminRoleItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isImmutable: boolean;
  permissions: Array<{
    permission: PermissionItem;
  }>;
  users: Array<{
    userId: string;
  }>;
};

export type AdminUserItem = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  emailVerified: boolean;
  assignedRoles: Array<{
    role: {
      id: string;
      name: string;
      isImmutable: boolean;
      isSystem: boolean;
    };
  }>;
};

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  } | null;
};
