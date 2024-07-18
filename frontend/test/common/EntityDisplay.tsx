import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useGetEntityInformation } from 'actions/user'
import { EntityObject } from 'types/types'
import { testUserInformation } from 'utils/test/testModels'
import { describe, expect, it, vi } from 'vitest'

import EntityDisplay from '../../src/common/EntityDisplay'

vi.mock('../../actions/user', () => ({
  useGetEntityInformation: vi.fn(),
}))

describe('EntityDisplay', () => {
  it('When given additional dynamic properties the user display component should render all three properties', async () => {
    vi.mocked(useGetEntityInformation).mockReturnValue({
      entityInformation: testUserInformation,
      isEntityInformationLoading: false,
      isEntityInformationError: undefined,
      mutateEntityInformation: vi.fn(),
    })
    render(<EntityDisplay entity={new EntityObject('user', 'Joe Bloggs')} />)

    const entityDisplayName = await screen.findByTestId('entityDisplayName')
    fireEvent.mouseEnter(entityDisplayName)

    await waitFor(async () => {
      expect(await screen.findAllByTestId('entityDisplayNameProperty')).toBeDefined()
      expect(await screen.findAllByTestId('entityDisplayEmailProperty')).toBeDefined()
      expect(await screen.findAllByTestId('entityDisplayDynamicProperty-birthday')).toBeDefined()
    })
  })
})
