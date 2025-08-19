import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import browserCompatibility from '@/utils/browserCompatibility';

interface BookingDiagnosticsProps {
  services: any[];
  staff: any[];
  selectedPrimaryService: string;
  selectedSecondaryService: string;
  availableStaff: any[];
  requiredRoles: any;
}

const BookingDiagnostics: React.FC<BookingDiagnosticsProps> = ({
  services,
  staff,
  selectedPrimaryService,
  selectedSecondaryService,
  availableStaff,
  requiredRoles
}) => {
  const primaryService = services.find(s => s.id === selectedPrimaryService);
  const secondaryService = services.find(s => s.id === selectedSecondaryService);
  const browserInfo = browserCompatibility.getBrowserInfo();
  const compatibilityIssues = browserCompatibility.getIssues();

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">🔍 Diagnóstico de Agendamento</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Serviços:</strong> {services.length}
          </div>
          <div>
            <strong>Staff:</strong> {staff.length}
          </div>
          <div>
            <strong>Staff Disponível:</strong> {availableStaff.length}
          </div>
          <div>
            <strong>Serviço Primário:</strong> {primaryService?.name || 'Nenhum'}
          </div>
        </div>
        
        <div>
          <strong>Requisitos:</strong>
          <div className="flex gap-1 mt-1">
            <Badge variant={requiredRoles.can_bathe ? "default" : "secondary"} className="text-xs">
              Banho: {requiredRoles.can_bathe ? 'Sim' : 'Não'}
            </Badge>
            <Badge variant={requiredRoles.can_groom ? "default" : "secondary"} className="text-xs">
              Tosa: {requiredRoles.can_groom ? 'Sim' : 'Não'}
            </Badge>
            <Badge variant={requiredRoles.can_vet ? "default" : "secondary"} className="text-xs">
              Vet: {requiredRoles.can_vet ? 'Sim' : 'Não'}
            </Badge>
          </div>
        </div>

        <div>
          <strong>Staff Detalhes:</strong>
          <div className="mt-1 space-y-1">
            {staff.map(member => (
              <div key={member.id} className="flex justify-between text-xs">
                <span>{member.name}</span>
                <span className="flex gap-1">
                  {member.can_bathe && <Badge variant="outline" className="text-xs">B</Badge>}
                  {member.can_groom && <Badge variant="outline" className="text-xs">T</Badge>}
                  {member.can_vet && <Badge variant="outline" className="text-xs">V</Badge>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <strong>Navegador:</strong> {browserInfo.name} {browserInfo.version}
          <div className="text-xs text-gray-500">
            {browserInfo.isMobile ? 'Mobile' : browserInfo.isTablet ? 'Tablet' : 'Desktop'}
          </div>
        </div>

        {compatibilityIssues.length > 0 && (
          <div>
            <strong>Problemas de Compatibilidade:</strong>
            <div className="mt-1 space-y-1">
              {compatibilityIssues.map((issue, index) => (
                <div key={index} className="text-xs">
                  <Badge 
                    variant={issue.severity === 'critical' ? 'destructive' : 'secondary'} 
                    className="text-xs mr-1"
                  >
                    {issue.severity}
                  </Badge>
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingDiagnostics;
