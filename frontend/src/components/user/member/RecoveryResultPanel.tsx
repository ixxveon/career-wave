interface RecoveryResultPanelProps {
  found: boolean;
  maskedLoginIds: string[];
}

function RecoveryResultPanel({ found, maskedLoginIds }: RecoveryResultPanelProps) {
  return (
    <div className="cw-auth-result" aria-live="polite">
      {found && maskedLoginIds.length > 0 ? (
        <>
          <p>가입된 아이디를 확인했습니다.</p>
          <ul>
            {maskedLoginIds.map((loginId) => (
              <li key={loginId}>{loginId}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>입력하신 정보와 일치하는 계정을 바로 확인할 수 없습니다. 가입 정보를 다시 확인하거나 고객센터로 문의해주세요.</p>
      )}
    </div>
  );
}

export default RecoveryResultPanel;
