import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useGetReviewRoles } from 'actions/reviewRoles'
import { MarkdownDisplayProps } from 'src/common/MarkdownDisplay'
import SchemaButton from 'src/schemas/SchemaButton'
import { lightTheme } from 'src/theme'
import { testAccessRequestSchema, testManagerRoleInterface } from 'utils/test/testModels'
import { describe, expect, it, vi } from 'vitest'

vi.mock('src/common/MarkdownDisplay.tsx', () => ({ default: (_props: MarkdownDisplayProps) => <></> }))

vi.mock('actions/reviewRoles', () => ({
  useGetReviewRoles: vi.fn(),
}))

describe('SchemaButton', () => {
  it('displays a loading spinner when loading prop is true', async () => {
    vi.mocked(useGetReviewRoles).mockReturnValue({
      reviewRoles: [testManagerRoleInterface],
      isReviewRolesLoading: false,
      isReviewRolesError: undefined,
      mutateReviewRoles: vi.fn(),
    })
    render(
      <ThemeProvider theme={lightTheme}>
        <SchemaButton schema={testAccessRequestSchema} onClick={() => undefined} loading />
      </ThemeProvider>,
    )

    await waitFor(async () => {
      expect(await screen.findByRole('progressbar')).toBeDefined()
    })
  })

  it('does not display a loading spinner when loading prop is false', async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <SchemaButton schema={testAccessRequestSchema} onClick={() => undefined} />
      </ThemeProvider>,
    )

    await waitFor(async () => {
      const loadingSpinner = await screen.queryByRole('progressbar')
      expect(loadingSpinner).toBeNull()
    })
  })

  it('fires the onClick event when the schema button is clicked', async () => {
    const handleClickSpy = vi.fn()
    render(
      <ThemeProvider theme={lightTheme}>
        <SchemaButton schema={testAccessRequestSchema} onClick={handleClickSpy} />
      </ThemeProvider>,
    )

    await waitFor(async () => {
      const schemaButton = screen.getByTestId('selectSchemaButton-access-request-schema')
      fireEvent.click(schemaButton)
      expect(handleClickSpy).toHaveBeenCalledOnce()
    })
  })
})
