import dedent from 'dedent-js'
import mjml2html from 'mjml'

import { ReviewKind, ReviewKindKeys } from '../../../../types/v2/enums.js'
import { BaseEmailTemplate, IEmailTemplate } from './baseEmailTemplate.js'
import config from '../../../../utils/v2/config.js'

export class ReleaseReviewEmail extends BaseEmailTemplate implements IEmailTemplate {
  from: string = config.smtp.from // sender address
  subject: string = ''
  text: string = ''
  html: string = ''
  to: string = ''

  setTo(emailAddress: string) {
    this.to = emailAddress
  }

  setSubject(resourceName: string, reviewerRole: string) {
    this.subject = dedent(`
    ${reviewerRole.toUpperCase()}: You have been requested to review '${resourceName}' on Bailo
  `)
  }

  setText(releaseName: string, modelId: string, baseUrl: string, author: string) {
    // V2 change- we don't store the author of a release
    // TODO - Replace with URL to specific model release
    this.text = dedent(`
    You have been requested to review '${releaseName}' on Bailo.

    Review Category: '${ReviewKind.Release}'
    Author: '${author}'

    Open ${ReviewKind.Release}: ${baseUrl}/model/${modelId}
    See Reviews: ${baseUrl}/review
  `)
  }

  setHtml(releaseName: string, modelId: string, baseUrl: string, author: string) {
    this.html = mjml2html(
      super.wrapper(`
    <mj-section background-color="#27598e" padding-bottom="5px" padding-top="20px">
      <mj-column width="100%">
        <mj-text align="center" color="#FFF" font-size="13px" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="28px" padding-top="28px"><span style="font-size:20px; font-weight:bold">You have been requested to review a ${ReviewKind.Release.toLowerCase()}.</span>
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#356cc7" padding-bottom="15px">
      <mj-column>
        <mj-text align="center" color="#FFF" font-size="15px" font-family="Ubuntu, Helvetica, Arial, sans-serif" padding-left="25px" padding-right="25px" padding-bottom="0px"><strong>Model Name</strong></mj-text>
        <mj-text align="center" color="#FFF" font-size="13px" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="20px" padding-top="10px">${releaseName}</mj-text>
      </mj-column>
      <mj-column>
        <mj-text align="center" color="#FFF" font-size="15px" font-family="Ubuntu, Helvetica, Arial, sans-serif" padding-left="25px" padding-right="25px" padding-bottom="0px"><strong>Review Category</strong></mj-text>
        <mj-text align="center" color="#FFF" font-size="13px" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="20px" padding-top="10px">${
          ReviewKind.Release
        }</mj-text>
      </mj-column>
      <mj-column>
        <mj-text align="center" color="#FFF" font-size="15px" font-family="Ubuntu, Helvetica, Arial, sans-serif" padding-left="25px" padding-right="25px" padding-bottom="0px"><strong>Author</strong></mj-text>
        <mj-text align="center" color="#FFF" font-size="13px" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="20px" padding-top="10px">${author}</mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#27598e" padding-bottom="20px" padding-top="20px">
      <mj-column width="50%">
        <mj-button background-color="#f37f58" color="#FFF" font-size="14px" align="center" font-weight="bold" border="none" padding="15px 30px" border-radius="10px" href="${baseUrl}/model/${modelId}" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="10px">Open ${
        ReviewKind.Release
      }</mj-button>
      </mj-column>
      <mj-column width="50%">
        <mj-button background-color="#f37f58" color="#FFF" font-size="14px" align="center" font-weight="bold" border="none" padding="15px 30px" border-radius="10px" href="${baseUrl}/review" font-family="Helvetica" padding-left="25px" padding-right="25px" padding-bottom="12px">See Reviews</mj-button>
      </mj-column>
    </mj-section>
  `)
    ).html
  }
}
