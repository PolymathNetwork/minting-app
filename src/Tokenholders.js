import React, { Fragment, useState } from 'react'
import { Table, Typography, Button, InputNumber, Popover } from 'antd'
const { Column } = Table
const { Text } = Typography

export default function TokenholdersTable({ tokenholders, burnTokens }) {
  const [ burnAmount, setBurnAmount ] = useState(1)

  function handleChange(v, max) {
    if (v > 0 && v <= max) {
      setBurnAmount(v)
    }
  }

  return (
    <Table dataSource={tokenholders} rowKey="address">
      <Column
        title='Address'
        dataIndex='address'
        key='address'
        render={(text) => <Text>{text}</Text>}
      />
      <Column
        title='Balance'
        dataIndex='balance'
        key='balance'
        render={(text) => text}
      />
      <Column
        title='Actions'
        render={(text, record, index) =>
          <Popover
            content={(
              <Fragment>
                <InputNumber
                  placeholder="amount"
                  max={Number(record.balance)}
                  min={1}
                  InputNumber={true}
                  value={burnAmount}
                  defaultValue={burnAmount}
                  onChange={(v) => handleChange(v, record.balance)}
                />
                <Button type="danger"
                  onClick={() => burnTokens(burnAmount, record.address)}>
                  Burn
                </Button>
              </Fragment>
            )}>
            <Button type="primary">
              Burn
            </Button>
          </Popover>}
      />
    </Table>
  )
}
