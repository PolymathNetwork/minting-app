import React, { useContext, useEffect, Fragment } from 'react'
import { usePolymathSdk, useTokenSelector, User, Network} from '@polymathnetwork/react'
import { BigNumber } from '@polymathnetwork/sdk'
import FileSaver from 'file-saver'

import { Store } from './index'
import { Layout, Spin, Alert, Button, Upload, Icon, message } from 'antd'
import ShareholdersTable from './Shareholders'

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
  case 'RELOAD_SHAREHOLDERS':
    const { tokenIndex } = action
    return {
      ...state,
      tokenIndex,
      records: undefined,
      error: undefined,
      shareholders: [],
      reloadShareholders: true,
    }
  default:
    console.error(`Unrecognized action type: ${action.type}`)
  }
  return state
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
    error
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

  const records = shareholders.map(({address, balance}) => ({
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
      message.success(`${info.file.name} file uploaded successfully`)
      getData(info.file.originFileObj, data => {
        importData(data)
      })
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`)
    }
  }

  const issueTokens = async (records) => {
    const q = await token.issuance.issue({issuanceData: records})
    await q.run()
    await new Promise(resolve => setTimeout(resolve, 1000))
    dispatch({type: 'RELOAD_SHAREHOLDERS'})
  }

  const burnTokens = async (amount, from, reason = '') => {
    asyncAction(dispatch, () => controllerRedeem(amount, from, reason), `Burning ${amount} tokens from ${from}`)
  }
  
  const controllerRedeem = async (amount, from, reason) => {
    reason = '0x' + reason
    amount = new BigNumber(amount)
    while (true) {
      try {
        const q = await token.controller.redeem({ amount, from, reason })
        await q.run()
        await new Promise(resolve => setTimeout(resolve, 3000))
        dispatch({type: 'RELOAD_SHAREHOLDERS'})
        return
      }
      catch (error) {
        console.error(error)
        if (error.message.includes('You must be the controller')) {
          console.log(`Add ${walletAddress} as controller`)
          const addControllerQ = await token.controller.modifyController({controller: walletAddress})
          await addControllerQ.run()
        }
        else {
          dispatch({type: 'ERROR', error: error.message})
          return
        }
      }
    }
  }

  const importData = (data) => {
    data = data.split('\r\n')
      .map(record => record.trim())
      .filter(record => record.length)
      // Convert string amounts to BigNumber.
      .map(record => {
        let [address, amount] = record.split(',')
        return {address, amount: new BigNumber(amount)}
      })
    asyncAction(dispatch, () => issueTokens(data), 'Issuing tokens')
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
                  {tokenSelector({
                    onTokenSelect: () => dispatch({type: 'TOKEN_SELECTED'})
                  })}
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
              { token && 
                <Fragment>
                  <Button style={{ marginTop: 20, marginBottom: 20, marginRight: 20 }} type="primary" onClick={exportData}>Export</Button>
                  <Upload style={{ marginTop: 20, marginBottom: 20 }} onChange={fileUploadChange}
                    accept='csv'
                    showUploadList={false}
                    name={'file'}
                    action={'https://www.mocky.io/v2/5cc8019d300000980a055e76'}
                    headers={{
                      authorization: 'authorization-text',
                    }}>
                    <Button>
                      <Icon type="upload"/>Import
                    </Button>
                  </Upload>
                </Fragment>
              }
              { shareholders.length > 0 &&
              <ShareholdersTable shareholders={records} burnTokens={burnTokens}/> }
            </Content>
          </Layout>
        </Layout>
      </Spin>
    </div>
  )
}

export default App
