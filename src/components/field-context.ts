import { createContext, useContext } from 'react'

export interface FieldIds {
  labelId: string
  hintId?: string
  errorId?: string
}

export const FieldContext = createContext<FieldIds | null>(null)

export function useFieldIds(): FieldIds {
  return useContext(FieldContext) ?? { labelId: '' }
}
