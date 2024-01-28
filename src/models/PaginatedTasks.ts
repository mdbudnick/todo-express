interface PaginatedTasks {
  total: number
  totalPages: number
  pageSize: number
  page: number
  tasks: Task[]
}

export default PaginatedTasks
