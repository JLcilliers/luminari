'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserCircle, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { usePersonas, useCreatePersona, useDeletePersona } from '@/hooks'

interface PersonaListProps {
  projectId: string
}

export function PersonaList({ projectId }: PersonaListProps) {
  const { data: personas, isLoading } = usePersonas(projectId)
  const createPersona = useCreatePersona()
  const deletePersona = useDeletePersona()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPersona, setNewPersona] = useState({
    name: '',
    description: '',
    age_range: '',
    traits: [] as string[],
  })
  const [newTrait, setNewTrait] = useState('')

  const handleCreate = async () => {
    if (!newPersona.name.trim()) return

    await createPersona.mutateAsync({
      project_id: projectId,
      name: newPersona.name.trim(),
      description: newPersona.description.trim() || undefined,
      age_range: newPersona.age_range.trim() || undefined,
      traits: newPersona.traits,
    })

    setNewPersona({ name: '', description: '', age_range: '', traits: [] })
    setIsDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this persona?')) {
      await deletePersona.mutateAsync(id)
    }
  }

  const addTrait = () => {
    if (newTrait.trim() && !newPersona.traits.includes(newTrait.trim())) {
      setNewPersona(prev => ({
        ...prev,
        traits: [...prev.traits, newTrait.trim()]
      }))
      setNewTrait('')
    }
  }

  const removeTrait = (trait: string) => {
    setNewPersona(prev => ({
      ...prev,
      traits: prev.traits.filter(t => t !== trait)
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Personas
            </CardTitle>
            <CardDescription>
              Define target audience personas to understand how AI perceives your brand for different users
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Persona</DialogTitle>
                <DialogDescription>
                  Create a target audience persona to track relevant AI queries
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Persona Name</label>
                    <Input
                      value={newPersona.name}
                      onChange={(e) => setNewPersona(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., SEO Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Age Range (optional)</label>
                    <Input
                      value={newPersona.age_range}
                      onChange={(e) => setNewPersona(prev => ({ ...prev, age_range: e.target.value }))}
                      placeholder="e.g., 28-40"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    value={newPersona.description}
                    onChange={(e) => setNewPersona(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this persona's role and goals..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Traits</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newPersona.traits.map((trait) => (
                      <Badge
                        key={trait}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {trait}
                        <button onClick={() => removeTrait(trait)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTrait}
                      onChange={(e) => setNewTrait(e.target.value)}
                      placeholder="Add a trait..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait())}
                    />
                    <Button variant="outline" onClick={addTrait} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createPersona.isPending}>
                  {createPersona.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Persona'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : personas && personas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <Card key={persona.id} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleDelete(persona.id)}
                  disabled={deletePersona.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg">{persona.name}</h3>
                  {persona.age_range && (
                    <p className="text-sm text-muted-foreground">Age: {persona.age_range}</p>
                  )}
                  {persona.description && (
                    <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                      {persona.description}
                    </p>
                  )}
                  {persona.traits && persona.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {persona.traits.map((trait) => (
                        <Badge key={trait} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No personas defined yet</p>
            <p className="text-sm">Add personas to track AI visibility for different audience segments</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
