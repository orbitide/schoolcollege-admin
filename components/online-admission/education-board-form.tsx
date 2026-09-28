"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { EDUCATION_BOARDS_HREF } from "@/components/online-admission/education-board-list"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/lib/current-user"
import {
  addEducationBoard,
  isDuplicateEducationBoardName,
  updateEducationBoard,
  useEducationBoard,
} from "@/lib/education-boards"

// Legacy EducationBoard/CreateEdit: the generic base form with just a name.
// Names are stored in upper case and must be unique among boards not deleted.
export function EducationBoardForm({ id }: { id?: number }) {
  const router = useRouter()
  const user = useCurrentUser()
  const board = useEducationBoard(id ?? -1)
  const isNew = id == null
  const [name, setName] = React.useState(board?.name ?? "")
  const [error, setError] = React.useState<string>()
  const nameId = React.useId()

  if (!isNew && (!board || board.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">No education board found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={EDUCATION_BOARDS_HREF}>Back to education boards</Link>
        </Button>
      </div>
    )
  }

  function save(andNew: boolean) {
    const next = !name.trim()
      ? "Name is required."
      : isDuplicateEducationBoardName(name, id)
        ? "Education board name won't be duplicate."
        : undefined
    setError(next)
    if (next) return
    if (isNew) {
      addEducationBoard(name, user.name)
      toast.success("Data saved successfully")
    } else {
      updateEducationBoard(id, name, user.name)
      toast.success("Data updated successfully")
    }
    if (andNew) {
      setName("")
    } else {
      router.push(EDUCATION_BOARDS_HREF)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
    >
      <Card className="max-w-xl">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">
              {isNew ? "Education Board Create" : "Education Board Update"}
            </CardTitle>
            <CardDescription>
              {isNew ? "Create a new education board" : `Update ${board?.name}`}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={EDUCATION_BOARDS_HREF}>Manage</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={nameId}>
              Name
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id={nameId}
              value={name}
              placeholder="Enter Name."
              aria-invalid={!!error}
              className="uppercase"
              onChange={(event) => {
                setName(event.target.value)
                setError(undefined)
              }}
            />
            <FieldError>{error}</FieldError>
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button asChild type="button" variant="outline">
            <Link href={EDUCATION_BOARDS_HREF}>Back</Link>
          </Button>
          {isNew && (
            <Button type="button" variant="secondary" onClick={() => save(true)}>
              Save and new
            </Button>
          )}
          <Button type="submit">{isNew ? "Save" : "Update"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
