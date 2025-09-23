import React from 'react'

const page = ({ params }: { params: { groupId: string } }) => {
  const { groupId } = params;
  return (
    <div>
      <h1>Group {groupId}</h1>
    </div>
  )
}

export default page
