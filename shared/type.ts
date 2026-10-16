export interface ISourceItem {
  id: string;
  title: string;
  type: PanFilter;
  menu: string;
  createdAt: string;
  isSelf?: boolean;
  description?: string;
  status?: number;
  cid?: number | null;
  cat?: string;
}
