export type PersonalParameterCategory = 'clothes' | 'personal' | 'other'
export type PersonalParameterVisibility = 'private' | 'shared'

export interface PersonalParameterField {
  id: string
  label: string
  value: string
  unit: string
}

export interface PersonalParameterItem {
  id: string
  workspaceId: string
  ownerId: string
  title: string
  category: PersonalParameterCategory
  visibility: PersonalParameterVisibility
  note: string
  fields: PersonalParameterField[]
  favorite: boolean
  createdAt: string
  updatedAt: string
}
