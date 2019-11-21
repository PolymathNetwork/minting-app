import React from 'react'
import { Table, Typography } from 'antd'
const { Column } = Table
const { Text } = Typography

export default function ShareholdersTable({shareholders, openForm, removeShareholders}) {
  return (
    <Table dataSource={shareholders} rowKey="address">
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
    </Table>
  )
}
