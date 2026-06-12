import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyWeekModal } from './CopyWeekModal'

const mockCopyWeekMutate = vi.fn()
const mockToast = vi.fn()

let mockCopyWeekState = { mutate: mockCopyWeekMutate, isPending: false }
let mockTargetMeals: { data: Array<unknown> } | undefined

vi.mock('@/hooks/useMealPlans', () => ({
  useCopyWeek: () => mockCopyWeekState,
  useMealPlans: (params?: { start_date?: string; end_date?: string }) => ({
    data: params ? mockTargetMeals : undefined,
  }),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast, confirm: vi.fn() }),
}))

// Source week: Monday Jun 9 2025 -> Sun Jun 15 2025
const sourceWeekStart = new Date(2025, 5, 9)

const renderModal = (open = true) =>
  render(<CopyWeekModal open={open} onOpenChange={vi.fn()} sourceWeekStart={sourceWeekStart} />)

const getDateInput = () => screen.getByLabelText('Target week') as HTMLInputElement

describe('CopyWeekModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCopyWeekState = { mutate: mockCopyWeekMutate, isPending: false }
    mockTargetMeals = { data: [] }
  })

  it('shows the source week label', () => {
    renderModal()
    expect(screen.getByText('Copy from Jun 9 - Jun 15')).toBeInTheDocument()
  })

  it('renders a date picker for the target week', () => {
    renderModal()
    expect(getDateInput()).toBeInTheDocument()
    expect(getDateInput().type).toBe('date')
  })

  it('does not render content when closed', () => {
    renderModal(false)
    expect(screen.queryByText('Copy Week')).not.toBeInTheDocument()
  })

  it('snaps any selected day to the Monday of that week', async () => {
    const user = userEvent.setup()
    renderModal()
    // Pick Thursday Jun 19 2025 -> should snap to Monday Jun 16 2025
    await user.type(getDateInput(), '2025-06-19')
    expect(screen.getByText('Copies into week of Jun 16 - Jun 22')).toBeInTheDocument()
  })

  it('disables confirm until a target week is selected', async () => {
    const user = userEvent.setup()
    renderModal()
    const confirm = screen.getByRole('button', { name: 'Copy Week' })
    expect(confirm).toBeDisabled()

    await user.type(getDateInput(), '2025-06-16')
    expect(confirm).toBeEnabled()
  })

  it('warns and switches the confirm label when the target week has meals', async () => {
    mockTargetMeals = { data: [{ id: 'm1' }] }
    const user = userEvent.setup()
    renderModal()

    await user.type(getDateInput(), '2025-06-16')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The target week already has meals. They will be replaced.'
    )
    expect(screen.getByRole('button', { name: 'Overwrite' })).toBeInTheDocument()
  })

  it('does not warn when the target week is empty', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(getDateInput(), '2025-06-16')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy Week' })).toBeInTheDocument()
  })

  it('calls useCopyWeek with source and target Mondays on confirm', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(getDateInput(), '2025-06-16')
    await user.click(screen.getByRole('button', { name: 'Copy Week' }))

    expect(mockCopyWeekMutate).toHaveBeenCalledWith(
      { source_week_start: '2025-06-09', target_week_start: '2025-06-16' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
  })

  it('closes the modal and toasts on success', async () => {
    mockCopyWeekMutate.mockImplementation((_data, opts: { onSuccess: () => void }) =>
      opts.onSuccess()
    )
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CopyWeekModal open onOpenChange={onOpenChange} sourceWeekStart={sourceWeekStart} />)

    await user.type(getDateInput(), '2025-06-16')
    await user.click(screen.getByRole('button', { name: 'Copy Week' }))

    expect(mockToast).toHaveBeenCalledWith('Week copied', 'success')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('toasts an error and keeps the modal open on failure', async () => {
    mockCopyWeekMutate.mockImplementation((_data, opts: { onError: () => void }) => opts.onError())
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CopyWeekModal open onOpenChange={onOpenChange} sourceWeekStart={sourceWeekStart} />)

    await user.type(getDateInput(), '2025-06-16')
    await user.click(screen.getByRole('button', { name: 'Copy Week' }))

    expect(mockToast).toHaveBeenCalledWith('Failed to copy week', 'error')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('shows a spinner and disables confirm while pending', async () => {
    const user = userEvent.setup()
    const { rerender } = renderModal()

    await user.type(getDateInput(), '2025-06-16')

    mockCopyWeekState = { mutate: mockCopyWeekMutate, isPending: true }
    rerender(<CopyWeekModal open onOpenChange={vi.fn()} sourceWeekStart={sourceWeekStart} />)

    const confirm = screen.getByRole('button', { name: /Copy Week/ })
    expect(confirm).toBeDisabled()
    expect(confirm.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CopyWeekModal open onOpenChange={onOpenChange} sourceWeekStart={sourceWeekStart} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CopyWeekModal open onOpenChange={onOpenChange} sourceWeekStart={sourceWeekStart} />)

    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
