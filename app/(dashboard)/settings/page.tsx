'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Settings, Bell, Shield, Database, Key } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">Configure your BIM Finance platform.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main settings */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" /> General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input defaultValue="BIM Staffing LLC" />
              </div>
              <div className="space-y-2">
                <Label>Company TRN (Tax Registration Number)</Label>
                <Input defaultValue="100123456700001" />
              </div>
              <div className="space-y-2">
                <Label>Base Currency</Label>
                <Input defaultValue="AED" />
              </div>
              <div className="space-y-2">
                <Label>VAT Rate (%)</Label>
                <Input defaultValue="5" type="number" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium text-sm">Unpaid Invoice Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when invoices pass due date</p>
                </div>
                <Badge>Enabled</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium text-sm">Salary Mismatch Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when salary amounts differ from calculations</p>
                </div>
                <Badge>Enabled</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium text-sm">Bank Upload Confirmations</p>
                  <p className="text-xs text-muted-foreground">Notify after successful statement uploads</p>
                </div>
                <Badge variant="secondary">Disabled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side info */}
        <div className="space-y-6">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">JWT Auth</span><Badge>Enabled</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">RBAC</span><Badge>Enabled</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Audit Logs</span><Badge>Enabled</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rate Limiting</span><Badge>Enabled</Badge></div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" /> Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Engine</span><span>MongoDB</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ODM</span><span>Mongoose 8</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Models</span><span>13</span></div>
              <Button variant="outline" size="sm" className="w-full mt-2">Test Connection</Button>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-violet-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" /> AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>OpenAI</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span>gpt-4o</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">API Key</span><Badge variant="secondary">Configured</Badge></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
