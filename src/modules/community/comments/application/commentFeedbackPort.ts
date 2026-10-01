export interface CommentConversationFeedback {
  error(message: string): void;
  success(message: string): void;
  confirm(title: string, message: string, confirmLabel: string, cancelLabel: string): Promise<{ isConfirmed: boolean }>;
}
