export interface UserPhotoData {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export interface UserPhotoViewerContextType {
  openUserPhoto: (userId: string, userName: string, avatarUrl?: string) => void;
  closeUserPhoto: () => void;
  isVisible: boolean;
  userData: UserPhotoData | null;
}
