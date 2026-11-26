/** 教程章节结构（中英两份内容共享同一形状） */
export interface TutorialSection {
  heading?: string
  paras: string[]
}

export interface Chapter {
  id: string
  title: string
  icon: string
  sections: TutorialSection[]
}
