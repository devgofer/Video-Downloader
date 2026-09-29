from abc import ABC, abstractmethod

class PlatformAdapter(ABC):
    name: str

    @abstractmethod
    def can_handle(self, host: str) -> bool:
        raise NotImplementedError

class HostPlatformAdapter(PlatformAdapter):
    hosts: set[str] = set()

    def can_handle(self, host: str) -> bool:
        return host in self.hosts or any(host.endswith("." + item) for item in self.hosts)
