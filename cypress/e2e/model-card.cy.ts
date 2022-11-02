describe('Model with model card only', () => {
  before(() => {
    cy.log('Navigate to Upload page and json tab')
    cy.visit('/upload')
    cy.get('[data-test=uploadJsonTab]').click({ force: true })

    cy.log('Selecting schema and inputting metadata')
    cy.get('[data-test=selectSchemaInput]').trigger('mousedown', { force: true, button: 0 })
    cy.fixture('schema_names.json').then((schemaNames) => {
      cy.get(`[role=option]:contains(${schemaNames.model})`).click()
    })
    cy.fixture('minimal_metadata_modelcard.json').then((metadata) => {
      cy.get('[data-test=metadataTextarea]')
        .clear()
        .type(JSON.stringify(metadata), { parseSpecialCharSequences: false, delay: 0 })
    })

    cy.log('Submitting model')
    cy.get('[data-test=warningCheckbox]').click()
    cy.get('[data-test=submitButton]').click()
    cy.url().should('contain', '/model/', { timeout: 10000 })
  })

  it('Correctly displays a model card only view', () => {
    cy.log('Checking for model card alert message')
    cy.get('[data-test=modelCardPageAlert]').contains('This model version was uploaded as just a model card')
    cy.get('[data-test=metadataDisplay]').contains('Model card for Testing')
  })

  it('Can edit an existing model version', () => {
    cy.log('Select edit version')
    cy.get('[data-test=modelActionsButton]').click({ force: true })
    cy.get('[data-test=editModelButton]').click({ force: true })
    cy.get('[data-test=uploadFormTabs]').contains('Designer')

    cy.log('Inputting edited metadata')
    cy.get('[data-test=uploadJsonTab]').click({ force: true })
    cy.fixture('minimal_metadata_edit.json').then((metadata) => {
      cy.get('[data-test=metadataTextarea]')
        .clear()
        .type(JSON.stringify(metadata), { parseSpecialCharSequences: false, delay: 0 })
    })

    cy.log('Submitting edited model')
    cy.get('[data-test=warningCheckbox]').click()
    cy.get('[data-test=submitButton]').click()
    cy.url().should('contain', '/model/', { timeout: 10000 })
    cy.get('[data-test=metadataDisplay]').contains('This is an edit')
    cy.get('[data-test=metadataDisplay]').contains('Model card for Testing')
  })

  it('Can upload a new version of an existing model version', () => {
    cy.log('Select new version')
    cy.get('[data-test=modelActionsButton]').click({ force: true })
    cy.get('[data-test=newVersionButton]').click({ force: true })
    cy.get('[data-test=uploadFormTabs]').contains('Designer')

    cy.log('Inputting new version metadata')
    cy.get('[data-test=uploadJsonTab]').click({ force: true })
    cy.fixture('minimal_metadata_modelcard_new_version.json').then((metadata) => {
      cy.get('[data-test=metadataTextarea]')
        .clear()
        .type(JSON.stringify(metadata), { parseSpecialCharSequences: false, delay: 0 })
    })

    cy.log('Submitting new version')
    cy.get('[data-test=warningCheckbox]').click()
    cy.get('[data-test=submitButton]').click()
    cy.url().should('contain', '/model/', { timeout: 10000 })
    cy.get('[data-test=metadataDisplay]').contains('v2')
    cy.get('[data-test=metadataDisplay]').contains('Model card for Testing')
  })
})

export {}
