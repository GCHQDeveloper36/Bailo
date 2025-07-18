import { ArrowDropDown } from '@mui/icons-material'
import CommentIcon from '@mui/icons-material/ChatBubble'
import ListAltIcon from '@mui/icons-material/ListAlt'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useGetFileScannerInfo } from 'actions/fileScanning'
import { useGetReleasesForModelId } from 'actions/release'
import { useGetResponses } from 'actions/response'
import { useGetReviewRequestsForModel } from 'actions/review'
import { useGetUiConfig } from 'actions/uiConfig'
import { memoize } from 'lodash-es'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CopyToClipboardButton from 'src/common/CopyToClipboardButton'
import Loading from 'src/common/Loading'
import MarkdownDisplay from 'src/common/MarkdownDisplay'
import Paginate from 'src/common/Paginate'
import UserDisplay from 'src/common/UserDisplay'
import FileDisplay from 'src/entry/model/files/FileDisplay'
import CodeLine from 'src/entry/model/registry/CodeLine'
import ReviewBanner from 'src/entry/model/reviews/ReviewBanner'
import ReviewDisplay from 'src/entry/model/reviews/ReviewDisplay'
import MultipleErrorWrapper from 'src/errors/MultipleErrorWrapper'
import Link from 'src/Link'
import { EntryInterface, ReleaseInterface, ResponseInterface } from 'types/types'
import { formatDateString } from 'utils/dateUtils'
import { latestReviewsForEachUser } from 'utils/reviewUtils'
import { plural } from 'utils/stringUtils'

export interface ReleaseDisplayProps {
  model: EntryInterface
  release: ReleaseInterface
  latestRelease?: string
  hideReviewBanner?: boolean
  hideFileDownloads?: boolean
}

export default function ReleaseDisplay({
  model,
  release,
  latestRelease,
  hideReviewBanner = false,
  hideFileDownloads = false,
}: ReleaseDisplayProps) {
  const router = useRouter()

  const { reviews, isReviewsLoading, isReviewsError } = useGetReviewRequestsForModel({
    modelId: model.id,
    semver: release.semver,
  })

  const { releases, isReleasesLoading, isReleasesError, mutateReleases } = useGetReleasesForModelId(model.id)

  const { scanners, isScannersLoading, isScannersError } = useGetFileScannerInfo()
  const { uiConfig, isUiConfigLoading, isUiConfigError } = useGetUiConfig()
  const {
    responses: commentResponses,
    isResponsesLoading: isCommentResponsesLoading,
    isResponsesError: isCommentResponsesError,
  } = useGetResponses([release._id])
  const {
    responses: reviewResponses,
    isResponsesLoading: isReviewResponsesLoading,
    isResponsesError: isReviewResponsesError,
  } = useGetResponses([...reviews.map((review) => review._id)])

  const [reviewsWithLatestResponses, setReviewsWithLatestResponses] = useState<ResponseInterface[]>([])
  const [expanded, setExpanded] = useState<string | false>(false)

  function latestVersionAdornment() {
    if (release.semver === latestRelease) {
      return <Typography color='secondary'>(Latest)</Typography>
    }
  }

  useEffect(() => {
    if (!isReviewsLoading && reviews) {
      const latestReviews = latestReviewsForEachUser(reviews, reviewResponses)
      setReviewsWithLatestResponses(latestReviews)
    }
  }, [reviews, isReviewsLoading, reviewResponses])

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const FileRowItem = memoize(({ data, index }) => (
    <FileDisplay
      showMenuItems={{ rescanFile: scanners.length > 0 }}
      key={data[index].name}
      file={data[index]}
      modelId={model.id}
      mutator={mutateReleases}
      releases={releases}
    />
  ))

  const error = MultipleErrorWrapper('Unable to load release', {
    isReviewResponsesError,
    isScannersError,
    isReviewsError,
    isUiConfigError,
    isCommentResponsesError,
    isReleasesError,
  })
  if (error) return error

  return (
    <>
      {(isReviewsLoading ||
        isReleasesLoading ||
        isUiConfigLoading ||
        isCommentResponsesLoading ||
        isReviewResponsesLoading ||
        isScannersLoading) && <Loading />}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} justifyContent='center' alignItems='center'>
        <Box sx={{ width: '100%' }}>
          {reviews.length > 0 && !hideReviewBanner && <ReviewBanner release={release} />}
          <Stack spacing={1} p={2}>
            <Stack
              direction={{ sm: 'row', xs: 'column' }}
              justifyContent='space-between'
              alignItems='center'
              spacing={2}
            >
              <Stack
                direction={{ sm: 'row', xs: 'column' }}
                justifyContent='space-between'
                alignItems='center'
                spacing={1}
                sx={{ minWidth: 0 }}
              >
                <Link noLinkStyle href={`/model/${model.id}/release/${release.semver}`} noWrap>
                  <Stack direction='row' alignItems='center' spacing={1} width='100%'>
                    <Typography component='h2' variant='h6' color='primary' noWrap>
                      {release.semver}
                    </Typography>
                  </Stack>
                </Link>
                <CopyToClipboardButton
                  textToCopy={release.semver}
                  notificationText='Copied release semver to clipboard'
                  ariaLabel='copy release semver to clipboard'
                />
                {latestVersionAdornment()}
              </Stack>
              <Button onClick={() => router.push(`/model/${model.id}/history/${release.modelCardVersion}`)}>
                View Model Card
              </Button>
            </Stack>
            <Typography variant='caption' sx={{ mb: 2 }}>
              Created by {<UserDisplay dn={release.createdBy} />} on
              <Typography variant='caption' fontWeight='bold'>
                {` ${formatDateString(release.createdAt)}`}
              </Typography>
            </Typography>
            <MarkdownDisplay>{release.notes}</MarkdownDisplay>
            <Box>{(release.files.length > 0 || release.images.length > 0) && <Divider />}</Box>
            <Stack spacing={1}>
              {!hideFileDownloads && release.files.length > 0 && (
                <Accordion
                  expanded={expanded === 'filesPanel'}
                  onChange={handleAccordionChange('filesPanel')}
                  data-test={`release-files-accordion-${release.semver}`}
                >
                  <AccordionSummary sx={{ px: 0 }} expandIcon={<ArrowDropDown />}>
                    <Typography fontWeight='bold'>{`${expanded === 'filesPanel' ? 'Hide' : 'Show'} ${plural(release.files.length, 'file')}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paginate
                      list={release.files}
                      defaultSortProperty='name'
                      searchFilterProperty='name'
                      searchPlaceholderText='Search by filename'
                      emptyListText='No files found'
                      sortingProperties={[
                        { value: 'name', title: 'Name', iconKind: 'text' },
                        { value: 'createdAt', title: 'Date uploaded', iconKind: 'date' },
                        { value: 'updatedAt', title: 'Date updated', iconKind: 'date' },
                      ]}
                    >
                      {FileRowItem}
                    </Paginate>
                  </AccordionDetails>
                </Accordion>
              )}
              {release.images.length > 0 && (
                <Accordion expanded={expanded === 'imagesPanel'} onChange={handleAccordionChange('imagesPanel')}>
                  <AccordionSummary sx={{ px: 0 }} expandIcon={<ArrowDropDown />}>
                    <Typography fontWeight='bold'>{`${expanded === 'imagesPanel' ? 'Hide' : 'Show'} ${plural(release.images.length, 'Docker image')}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {release.images.map((image) => (
                      <Stack
                        key={`${image.repository}-${image.name}-${image.tag}`}
                        direction={{ sm: 'row', xs: 'column' }}
                        justifyContent='space-between'
                        alignItems='center'
                        spacing={1}
                      >
                        {uiConfig && (
                          <CodeLine line={`${uiConfig.registry.host}/${model.id}/${image.name}:${image.tag}`} />
                        )}
                      </Stack>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}
              <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                {!release.minor && <ReviewDisplay modelId={model.id} reviewResponses={reviewsWithLatestResponses} />}
                <IconButton href={`/model/${release.modelId}/release/${release.semver}#responses`}>
                  <Stack direction='row' spacing={2}>
                    {reviewResponses.length > 0 && (
                      <Tooltip title='Reviews'>
                        <Stack direction='row' spacing={1}>
                          <ListAltIcon color='primary' />
                          <Typography variant='caption'>{reviewResponses.length}</Typography>
                        </Stack>
                      </Tooltip>
                    )}
                    {commentResponses.length > 0 && (
                      <Tooltip title='Comments'>
                        <Stack direction='row' spacing={1}>
                          <CommentIcon color='primary' />
                          <Typography variant='caption'>{commentResponses.length}</Typography>
                        </Stack>
                      </Tooltip>
                    )}
                  </Stack>
                </IconButton>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </>
  )
}
