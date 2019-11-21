import React, { useContext, useEffect, Fragment } from 'react'
import { usePolymathSdk, useTokenSelector, User, Network} from '@polymathnetwork/react'
import { BigNumber } from '@polymathnetwork/sdk'
import FileSaver from 'file-saver'
import web3Utils from 'web3-utils'

import { Store } from './index'
import { Layout, Spin, Alert, Button, Upload, Icon, message, Descriptions, Badge, Divider } from 'antd'
import ShareholdersTable from './Shareholders'
import { _split } from './index'
console.log(web3Utils)

const { Content, Header, Sider } = Layout

export const reducer = (state, action) => {
  console.log('ACTION', action)
  switch (action.type) {
  case 'ASYNC_START':
    return {
      ...state,
      loading: true,
      loadingMessage: action.msg,
      error: undefined,
    }
  case 'ASYNC_COMPLETE':
    const { type, ...payload } = action
    return {
      ...state,
      ...payload,
      loading: false,
      loadingMessage: '',
      error: undefined
    }
  case 'ERROR':
  case 'ASYNC_ERROR':
    const { error } = action
    return {
      ...state,
      loading: false,
      loadingMessage: '',
      error,
    }
  case 'TOKEN_SELECTED':
    const { tokenIndex } = action
    return {
      ...state,
      tokenIndex,
      delegates: undefined,
      records: undefined,
      pmEnabled: undefined,
      error: undefined,
      features: undefined,
    }
  default:
    throw new Error(`Unrecognized action type: ${action.type}`)
  }
}

async function asyncAction(dispatch, func, msg = '') {
  try {
    dispatch({type: 'ASYNC_START', msg})
    const rets = await func()
    dispatch({type: 'ASYNC_COMPLETE', ...rets})
  }
  catch (error) {
    dispatch({type: 'ASYNC_ERROR', error: error.message})
  }
}

function App() {
  const [state, dispatch] = useContext(Store)
  const { reloadShareholders, shareholders } = state.AppReducer
  let {error: sdkError, sdk, networkId, walletAddress} = usePolymathSdk()
  let {error: tokenSelectorError, tokenSelector, tokens, tokenIndex} = useTokenSelector(sdk, walletAddress)

  let {
    loading,
    loadingMessage,
    error,
    // pmEnabled,
    // records,
    // features,
    // availableRoles
  } = state.AppReducer
  const token = tokens[tokenIndex]

  error = error || sdkError || tokenSelectorError
  if (!error && !loadingMessage) {
    if (!sdk) {
      loading = true
      loadingMessage = 'Initializing Polymath SDK'
    }
    else if (!tokens.length) {
      loading = true
      loadingMessage = 'Loading your security tokens'
    }
  }

  // Fetch shareholders + balances.
  useEffect(() => {
    async function fetchShareholders() {
      let shareholders = await token.shareholders.getShareholders()
      return {
        shareholders
      }
    }
    if ( reloadShareholders === true | token !== undefined ) {
      asyncAction(dispatch, () => fetchShareholders(token), 'Fetching shareholders as well as their token balances')
    }
  }, [tokens, reloadShareholders, token, dispatch])

  console.log(shareholders)
  const records = shareholders.map(({address, balance, canBuyFromSto, canReceiveAfter, kycExpiry, canSendAfter, isAccredited}) => ({
    address,
    balance: balance.toString()
  }))

  function getData(url, callback) {
    const reader = new FileReader()
    reader.addEventListener('load', () => callback(reader.result))
    reader.readAsText(url)
  }

  const fileUploadChange = (info) => {
    if (info.file.status !== 'uploading') {
      console.log(info.file, info.fileList)
    }
    if (info.file.status === 'done') {
      console.log('done', info)
      message.success(`${info.file.name} file uploaded successfully`)
      getData(info.file.originFileObj, data => {
        handleImport(data)
      })
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`)
    }
  }

  const handleImport = (data) => {
    console.log('handleImport', data)
    data = data.split('\r\n')
      .map(record => record.trim())
      .filter(record => record.length)
      // Convert string amounts to BigNumber.
      .map(record => {
        let [address, amount] = record.split(',')
        return {address, amount: new BigNumber(amount)}
      })
    console.log('parsedData', data)
    asyncAction(dispatch, () => mintTokens(data), 'Minting tokens')
  }

  const mintTokens = async (records) => {
    console.log('mintTokens', records)
    const q = await token.shareholders.mintTokens({mintingData: records})
    await q.run()
  }

  const exportData = () => {
    const csvContent = records.map(({address, balance}) => {
      return [address, balance].join(',')
    }).join('\r\n')
    console.log('csvContent', csvContent)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    FileSaver.saveAs(blob, 'whitelist.csv')
  }

  return (
    <div>
      <Spin spinning={loading} tip={loadingMessage} size="large">
        <Layout>
          <Header style={{
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}>
            <Network networkId={networkId} />
            <User walletAddress={walletAddress} />
          </Header>
          <Layout>
            <Sider width={350}
              style={{
                padding: 50,
                backgroundColor: '#FAFDFF'
              }}
            >
              { walletAddress && tokens &&
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 250,
                  justifyContent: 'flex-start'
                }}>
                  {tokenSelector}
                </div>
              }
            </Sider>
            <Content style={{
              padding: 50,
              backgroundColor: '#FAFDFF'
            }}>
              {error && <Alert
                message={error}
                type="error"
                closable
                showIcon
              />}
              { shareholders.length > 0 &&
                <Fragment>
                  <Button type="primary" onClick={exportData}>Export</Button>
                  <Upload onChange={fileUploadChange}
                    name={'file'}
                    action={'https://www.mocky.io/v2/5cc8019d300000980a055e76'}
                    headers={{
                      authorization: 'authorization-text',
                    }}>
                    <Button>
                      <Icon type="upload"/>Import
                    </Button>
                  </Upload>
                  <ShareholdersTable shareholders={records}/>
                </Fragment>
              }
            </Content>
          </Layout>
        </Layout>
      </Spin>
    </div>
  )
}

export default App
