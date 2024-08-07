import {
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FormContextType } from '@rjsf/utils'
import _ from 'lodash-es'
import { useCallback, useEffect, useMemo, useState } from 'react'
import MetricItem from 'src/MuiForms/MetricItem'
import { v4 as uuidv4 } from 'uuid'

export interface MetricValue {
  name: string
  value: number | string
}

interface Id {
  id: string
}

export type MetricValueWithId = MetricValue & Id

interface MetricsProps {
  onChange: (newValue: MetricValue[]) => void
  value: MetricValue[]
  label: string
  formContext?: FormContextType
  required?: boolean
}

export default function Metrics({ onChange, value, label, formContext, required }: MetricsProps) {
  const [metricsWithIds, setMetricsWithIds] = useState<MetricValueWithId[]>([])
  const theme = useTheme()

  useEffect(() => {
    const updatedMetricsWithIds = value.map((metric) => ({
      ...metric,
      id: uuidv4(),
    }))
    setMetricsWithIds(updatedMetricsWithIds)
  }, [value])

  const handleChange = useCallback(
    (newValues: MetricValue[]) => {
      onChange(newValues)
    },
    [onChange],
  )

  const handleMetricItemOnChange = useCallback(
    (updatedMetricItem: MetricValueWithId) => {
      const updatedMetricArray = _.cloneDeep(metricsWithIds)
      const index = metricsWithIds.findIndex((metric) => metric.id === updatedMetricItem.id)
      updatedMetricArray[index] = updatedMetricItem
      // Defaulting to an empty string will allow the input to empty. User will be prompted to enter a valid number.
      onChange(
        updatedMetricArray.map((metric) => ({ name: metric.name, value: parseInt(metric.value as string) || '' })),
      )
    },
    [metricsWithIds, onChange],
  )

  const handleDeleteItem = useCallback(
    (id: string) => {
      const updatedMetricArray = _.cloneDeep(metricsWithIds)
      onChange(updatedMetricArray.filter((metric) => metric.id !== id))
      return
    },
    [metricsWithIds, onChange],
  )

  const metricItems = useMemo(() => {
    return metricsWithIds.map((metric, index) => (
      <MetricItem key={index} metric={metric} onChange={handleMetricItemOnChange} onDelete={handleDeleteItem} />
    ))
  }, [handleDeleteItem, handleMetricItemOnChange, metricsWithIds])

  const metricsTableRows = useMemo(() => {
    return value.map((metric) => (
      <TableRow key={metric.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
        <TableCell component='th' scope='row'>
          {metric.name}
        </TableCell>
        <TableCell align='right'>{metric.value}</TableCell>
      </TableRow>
    ))
  }, [value])

  return (
    <>
      {formContext && formContext.editMode && (
        <Stack spacing={2} sx={{ width: 'fit-content' }}>
          <Typography fontWeight='bold'>
            {label}
            {required && <span style={{ color: theme.palette.error.main }}>{' *'}</span>}
          </Typography>
          <Stack spacing={2}>{metricItems}</Stack>
          <Button onClick={() => handleChange([...value, { name: '', value: 0 }])}>Add item</Button>
        </Stack>
      )}
      {formContext && !formContext.editMode && (
        <>
          <Typography fontWeight='bold'>
            {label}
            {required && <span style={{ color: theme.palette.error.main }}>{' *'}</span>}
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{ maxWidth: 'sm' }} size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Metric name</TableCell>
                  <TableCell align='right'>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{metricsTableRows}</TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  )
}
