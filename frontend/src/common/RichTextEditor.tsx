import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { useTheme } from '@mui/material/styles'
import { MDEditorProps } from '@uiw/react-md-editor'
import dynamic from 'next/dynamic'
import { ReactNode, useState } from 'react'

// The MD Editor library uses custom CSS property names which do not correspond to standard CSS naming
interface MDEdtiorStyling {
  [Key: string]: string
}

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: ReactNode
  textareaProps?: MDEditorProps['textareaProps']
  dataTest?: string
  errors?: string[]
  autoFocus?: boolean
  ref?: any
}

export default function RichTextEditor({
  value,
  onChange,
  textareaProps,
  label = <></>,
  dataTest = 'richTextEditor',
  errors,
  autoFocus = false,
  ref,
}: RichTextEditorProps) {
  const [hideToolbar, setHideToolbar] = useState(true)
  const theme = useTheme()

  const toggleToolbar = () => {
    setHideToolbar(!hideToolbar)
  }

  const handleChange = (newValue?: string) => {
    onChange(newValue || '')
  }

  const richTextareaProps = {
    'data-test': dataTest,
    ...textareaProps,
  }

  const styling: MDEdtiorStyling = {
    '--color-border-default': errors && errors.length > 0 ? theme.palette.error.main : '',
  }

  const handleOnFocus = (element: any) => {
    element.target.setSelectionRange(element.target.value.length, element.target.value.length)
  }

  return (
    <>
      <Box display='flex' overflow='auto'>
        {label}
        <Button size='small' onClick={toggleToolbar} sx={{ ml: 'auto' }}>
          {`${hideToolbar ? 'Show' : 'Hide'} Toolbar`}
        </Button>
      </Box>
      <MDEditor
        defaultTabEnable
        value={value}
        style={styling}
        ref={ref}
        preview='edit'
        hideToolbar={hideToolbar}
        height={150}
        textareaProps={{ onFocus: handleOnFocus, ...richTextareaProps, autoFocus }}
        onChange={handleChange}
      />
    </>
  )
}
